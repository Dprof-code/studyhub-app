// Types for the Expert Learner Discovery & Peer Matching feature

export interface MatchRequestData {
    subjects: string[];
    availability: string[];
    studyFormat: 'online' | 'in_person' | 'hybrid';
    maxGroupSize?: number;
    studyLevel: 'beginner' | 'intermediate' | 'advanced';
    preferredGender?: 'any' | 'same' | 'opposite';
    locationPreference?: string;
    additionalNotes?: string;
    stayAvailable?: boolean;
}

export interface MatchRequestResponse {
    success: boolean;
    error?: string;
    matchRequest?: {
        id: string;
        userId: number;
        subjects: string[];
        availability: string[];
        studyFormat: string;
        maxGroupSize: number;
        studyLevel: string;
        preferredGender: string;
        locationPreference?: string;
        additionalNotes?: string;
        status: string;
        createdAt: string;
        user: {
            id: number;
            name: string;
            email: string;
            department: string;
            year: number;
        };
    };
}

export interface MatchResult {
    id: string;
    user: {
        id: number;
        name: string;
        avatar?: string;
        department: string;
        year: number;
        gender?: string;
    };
    subjects: string[];
    availability: string[];
    studyFormat: string;
    studyLevel: string;
    locationPreference?: string;
    additionalNotes?: string;
    compatibilityScore: number;
    commonSubjects: string[];
    commonAvailability: string[];
}

export interface MatchesResponse {
    matches: MatchResult[];
    userRequest: {
        id: string;
        subjects: string[];
        availability: string[];
        studyFormat: string;
        studyLevel: string;
    };
}

export interface MatchActionResponse {
    success: boolean;
    error?: string;
    action: 'connected' | 'pending' | 'skipped';
    match?: {
        id: string;
        user: {
            id: number;
            name: string;
            email: string;
            department: string;
            avatar?: string;
        };
        chatRoomId?: string;
        connectedAt?: string;
        status?: string;
        message?: string;
        createdAt?: string;
    };
    chatRoom?: {
        id: string;
        name?: string;
        type: string;
        members: Array<{
            id: number;
            name: string;
            avatar?: string;
        }>;
    };
}

export interface ChatRoom {
    id: string;
    name?: string;
    type: 'direct' | 'group';
    createdAt: string;
    members: Array<{
        id: number;
        name: string;
        avatar?: string;
        department: string;
        year: number;
        lastSeen?: string;
    }>;
    messageCount: number;
}

export interface ChatMessage {
    id: string;
    content: string;
    type: 'text' | 'image' | 'file';
    createdAt: string;
    sender: {
        id: number;
        name: string;
        avatar?: string;
    };
    attachments: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
    }>;
    chatRoomId: string;
}

export interface ChatRoomResponse {
    chatRoom: ChatRoom;
    messages: ChatMessage[];
    relatedMatch?: {
        id: string;
        connectedAt: string;
        participants: Array<{
            id: number;
            name: string;
            avatar?: string;
            department: string;
        }>;
    };
}

export interface SendMessageRequest {
    content: string;
    type?: 'text' | 'image' | 'file';
    attachments?: Array<{
        name: string;
        url: string;
        type: string;
        size: number;
    }>;
}

export interface SendMessageResponse {
    success: boolean;
    message: ChatMessage;
    roomMembers: Array<{
        id: number;
        name: string;
        email: string;
    }>;
}