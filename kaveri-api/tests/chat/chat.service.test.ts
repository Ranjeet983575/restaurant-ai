import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyUserIntent, rerankMenuResults, resolveChatQuery } from '../../src/services/chat.service';

test('classifies menu, price, diet, restaurant, and booking requests', () => {
    assert.equal(classifyUserIntent('Show me vegetarian dishes'), 'diet');
    assert.equal(classifyUserIntent('What is the price of Chicken Biryani?'), 'price');
    assert.equal(classifyUserIntent('Where is your restaurant located?'), 'restaurant');
    assert.equal(classifyUserIntent('Can you reserve a table for 4?'), 'booking');
    assert.equal(classifyUserIntent('Recommend something spicy'), 'menu');
});

test('resolves a simple query payload without messages', () => {
    assert.equal(resolveChatQuery({ query: 'Where is your restaurant located?' }), 'Where is your restaurant located?');
    assert.equal(resolveChatQuery({ messages: [{ text: 'Hello there' }] }), 'Hello there');
    assert.equal(resolveChatQuery({ messages: [{ text: 'Ignored' }], query: 'Use query first' }), 'Use query first');
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
