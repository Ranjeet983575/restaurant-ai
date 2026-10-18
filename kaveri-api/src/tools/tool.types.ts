export type AgentToolName = 'restaurant_info' | 'menu_search' | 'availability' | 'reservation';

export interface ToolCall {
    tool: AgentToolName;
    status: 'completed' | 'failed' | 'needs_input' | 'not_run';
    summary: string;
}