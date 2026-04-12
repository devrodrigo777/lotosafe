export interface Company {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    radius: number;
  };
  adminEmail: string;
  createdAt: any;
}

export interface InstructionStep {
  id: string;
  type: 'text' | 'checkbox' | 'image' | 'single_choice' | 'multi_choice' | 'heading';
  label: string;
  options?: string[];
  required?: boolean;
  value?: any;
}

export interface Instruction {
  id: string;
  companyId: string;
  equipmentName: string;
  category: string;
  steps: InstructionStep[];
  likes: number;
  version?: number;
  qrCodeUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Comment {
  id: string;
  instructionId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: any;
}
