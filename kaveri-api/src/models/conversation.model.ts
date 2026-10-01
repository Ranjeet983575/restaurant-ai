import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationMessage {
    role: 'user' | 'assistant';
    text: string;
    createdAt: Date;
}

export interface IConversation extends Document {
    conversationId: string;
    messages: IConversationMessage[];
    state: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const conversationMessageSchema = new Schema<IConversationMessage>(
    {
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const conversationSchema = new Schema<IConversation>(
    {
        conversationId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        messages: {
            type: [conversationMessageSchema],
            default: [],
        },
        state: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);