import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyUserIntent, extractCustomerContact, extractCustomerName, extractPartySize, extractTableSelection, isExplicitBookingConfirmation, rerankMenuResults, resolveChatQuery } from '../../src/services/chat.service';
import { buildLLMMessages, runAgentToolLoop } from '../../src/services/llm.service';
import { conciergeTools, parseConciergeToolArguments } from '../../src/tools/agent-tools';
import { executeConciergeTool } from '../../src/tools/agent-tool-executor';

test('classifies menu, price, diet, restaurant, and booking requests', () => {
    assert.equal(classifyUserIntent('Show me vegetarian dishes'), 'diet');
    assert.equal(classifyUserIntent('What is the price of Chicken Biryani?'), 'price');
    assert.equal(classifyUserIntent('Where is your restaurant located?'), 'restaurant');
    assert.equal(classifyUserIntent('Can you reserve a table for 4?'), 'booking');
    assert.equal(classifyUserIntent('Recommend something spicy'), 'menu');
    assert.equal(classifyUserIntent('Tell me about Chicken Dum Biryani'), 'menu');
    assert.equal(classifyUserIntent('thanks'), 'smalltalk');
    assert.equal(classifyUserIntent('how to end chat?'), 'smalltalk');
    assert.equal(classifyUserIntent('goodbye'), 'smalltalk');
});

test('resolves a simple query payload without messages', () => {
    assert.equal(resolveChatQuery({ query: 'Where is your restaurant located?' }), 'Where is your restaurant located?');
    assert.equal(resolveChatQuery({ messages: [{ text: 'Hello there' }] }), 'Hello there');
    assert.equal(resolveChatQuery({ messages: [{ text: 'Ignored' }], query: 'Use query first' }), 'Use query first');
});

test('builds an LLM request with recent conversation history before the latest user turn', () => {
    const history = Array.from({ length: 13 }, (_, index) => ({
        role: 'user' as const,
        text: `turn ${index + 1}`,
    }));

    const messages = buildLLMMessages('system instructions', history, 'current question');

    assert.equal(messages.length, 14);
    assert.deepEqual(messages[0], { role: 'system', content: 'system instructions' });
    assert.deepEqual(messages[1], { role: 'user', content: 'turn 2' });
    assert.deepEqual(messages[12], { role: 'user', content: 'turn 13' });
    assert.deepEqual(messages[13], { role: 'user', content: 'current question' });
});

test('registers only the read-only concierge tools and validates their arguments', async () => {
    assert.deepEqual(
        conciergeTools.map(tool => tool.function?.name).sort(),
        ['menu_search', 'restaurant_info'],
    );
    assert.deepEqual(parseConciergeToolArguments('{"query":"vegan curry"}'), { query: 'vegan curry' });
    assert.throws(() => parseConciergeToolArguments('[]'), /JSON object/);
    assert.throws(() => parseConciergeToolArguments('{invalid'), SyntaxError);
    await assert.rejects(() => executeConciergeTool('delete_everything', {}), /not available/);
    await assert.rejects(() => executeConciergeTool('menu_search', { query: 4 }), /non-empty query/);
    await assert.rejects(() => executeConciergeTool('restaurant_info', { location: 'Hyderabad' }), /does not accept arguments/);
});

test('executes an allow-listed agent tool and feeds its result into the next model turn', async () => {
    const toolCall = {
        id: 'call-menu-search',
        type: 'function' as const,
        function: { name: 'menu_search', arguments: '{"query":"vegan curry"}' },
    };
    const completionMessages: Array<Array<{ role: string; content?: unknown }>> = [];
    const toolChoices: Array<string | undefined> = [];
    const executedTools: string[] = [];

    const result = await runAgentToolLoop(
        async (messages, toolChoice) => {
            completionMessages.push(messages as Array<{ role: string; content?: unknown }>);
            toolChoices.push(typeof toolChoice === 'string' ? toolChoice : undefined);
            if (completionMessages.length === 1) {
                return { choices: [{ message: { content: null, tool_calls: [toolCall] } }] };
            }
            return {
                choices: [{ message: { content: 'I found a vegan curry.' } }],
                usage: { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 },
            };
        },
        [{ role: 'user', content: 'Find a vegan curry.' }],
        conciergeTools,
        'required',
        async (name, args) => {
            executedTools.push(name);
            assert.deepEqual(args, { query: 'vegan curry' });
            return { items: ['Vegan curry'] };
        },
    );

    assert.deepEqual(executedTools, ['menu_search']);
    assert.deepEqual(toolChoices, ['required', 'auto']);
    assert.deepEqual(completionMessages[1].slice(-1), [{
        role: 'tool',
        tool_call_id: 'call-menu-search',
        content: '{"items":["Vegan curry"]}',
    }]);
    assert.equal(result.content, 'I found a vegan curry.');
    assert.deepEqual(result.tokens_used, { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 });
    assert.deepEqual(result.toolCalls.map(call => call.status), ['completed']);
});

test('requires an unambiguous confirmation phrase before finalizing a booking', () => {
    assert.equal(isExplicitBookingConfirmation('Yes, please!'), true);
    assert.equal(isExplicitBookingConfirmation('book it'), true);
    assert.equal(isExplicitBookingConfirmation('maybe, book it later'), false);
    assert.equal(isExplicitBookingConfirmation('cancel'), false);
});

test('only infers an unprefixed booking name when the assistant explicitly asked for it', () => {
    assert.equal(extractCustomerName('My name is Ranjeet Kumar'), 'Ranjeet Kumar');
    assert.equal(extractCustomerName('Ranjeet Kumar'), undefined);
    assert.equal(extractCustomerName('Ranjeet Kumar', true), 'Ranjeet Kumar');
    assert.equal(extractCustomerName('I prefer window seating', true), undefined);
});

test('recognizes booking phone numbers with 7 to 15 digits', () => {
    assert.deepEqual(extractCustomerContact('5253532'), { phone: '5253532' });
    assert.deepEqual(extractCustomerContact('3242423'), { phone: '3242423' });
    assert.deepEqual(extractCustomerContact('+91 98765-43210'), { phone: '+919876543210' });
    assert.deepEqual(extractCustomerContact('123456'), {});
    assert.deepEqual(extractCustomerContact('1234567890123456'), {});
    assert.deepEqual(extractCustomerContact('guest@example.com'), { email: 'guest@example.com' });
});

test('distinguishes selecting a table from changing the party size', () => {
    const tables = [
        { tableId: 'table-1', tableNumber: '1', capacity: 2 },
        { tableId: 'table-2', tableNumber: '2', capacity: 4 },
        { tableId: 'table-3', tableNumber: '3', capacity: 4 },
    ];

    assert.equal(extractTableSelection('1', tables)?.tableId, 'table-1');
    assert.equal(extractTableSelection('Table 1', tables)?.tableId, 'table-1');
    assert.equal(extractTableSelection('Table for 2', tables)?.tableId, 'table-1');
    assert.equal(extractTableSelection('Table for 4', tables), undefined);
    assert.equal(extractTableSelection('1 Ta', tables), undefined);
    assert.equal(extractPartySize('1'), 1);
    assert.equal(extractPartySize('1', false), undefined);
});

test('reranks semantic results for spicy and crispy queries', () => {
    const results = [
        {
            similarity_score: 0.82,
            menu: {
                name: 'Paneer Butter Masala',
                description: 'Creamy curry with soft paneer',
                vegetarian: true,
                tags: ['creamy', 'rich'],
            },
        },
        {
            similarity_score: 0.80,
            menu: {
                name: 'Chicken 65',
                description: 'Fiery fried chicken with curry leaves',
                vegetarian: false,
                tags: ['spicy', 'crispy'],
            },
        },
    ] as any;

    const ranked = rerankMenuResults('something spicy and crispy', results);
    assert.equal(ranked[0].menu.name, 'Chicken 65');
    assert.equal(ranked[1].menu.name, 'Paneer Butter Masala');
});
