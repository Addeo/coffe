import { User } from './user.interface';
export declare enum OrderStatus {
    WAITING = "waiting",
    PROCESSING = "processing",
    WORKING = "working",
    REVIEW = "review",
    COMPLETED = "completed"
}
export declare enum OrderStatusLabel {
    WAITING = "Waiting",
    PROCESSING = "Processing",
    WORKING = "In Progress",
    REVIEW = "Under Review",
    COMPLETED = "Completed"
}
export declare enum TerritoryType {
    URBAN = "urban",
    SUBURBAN = "suburban",
    RURAL = "rural",
    HOME = "home",
    ZONE_1 = "zone_1",
    ZONE_2 = "zone_2",
    ZONE_3 = "zone_3"
}
export declare enum EngineerType {
    STAFF = "staff",
    REMOTE = "remote",
    CONTRACT = "contract"
}
export interface Order {
    id: number;
    organizationId: number;
    organization?: Organization;
    assignedEngineerId?: number;
    assignedEngineer?: Engineer;
    createdById: number;
    createdBy: User;
    assignedById?: number;
    assignedBy?: User;
    title: string;
    description?: string;
    location: string;
    distanceKm?: number;
    territoryType?: TerritoryType;
    status: OrderStatus;
    plannedStartDate?: Date;
    actualStartDate?: Date;
    completionDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface Organization {
    id: number;
    name: string;
    address?: string;
    phone?: string;
}
export interface Engineer {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
    specialization?: string;
    isActive: boolean;
}
