import mongoose, { Document, Schema, Types } from 'mongoose';

export type TableStatus = 'available' | 'maintenance' | 'inactive';

export interface ITable extends Document {
    _id: Types.ObjectId;
    restaurantId: Types.ObjectId;
    restaurantName: string;
    tableNumber: string;
    capacity: number;
    area: 'indoor' | 'outdoor' | 'window' | 'private_room';
    tableType: string;
    features: string[];
    status: TableStatus;
    createdAt: Date;
    updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
        restaurantName: { type: String, required: true, index: true },
        tableNumber: { type: String, required: true },
        capacity: { type: Number, required: true, min: 1 },
        area: { type: String, enum: ['indoor', 'outdoor', 'window', 'private_room'], default: 'indoor' },
        tableType: { type: String, required: true },
        features: { type: [String], default: [] },
        status: { type: String, enum: ['available', 'maintenance', 'inactive'], default: 'available', index: true },
    },
    { timestamps: true }
);

tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

export const Table = mongoose.model<ITable>('Table', tableSchema);