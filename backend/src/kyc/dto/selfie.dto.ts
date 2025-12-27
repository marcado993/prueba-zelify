import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SelfieRequestDto {
    @ApiProperty({
        description: 'Document ID from the textract endpoint response',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    documentId: string;
}

export class SelfieVerificationDto {
    @ApiProperty({ description: 'KYC Document ID' })
    id: string;

    @ApiProperty({ description: 'User ID' })
    userId: string;

    @ApiProperty({ description: 'Whether the face verification passed' })
    isMatch: boolean;

    @ApiProperty({ description: 'Face similarity percentage (0-100)' })
    similarity: number;

    @ApiProperty({ description: 'Final KYC status: approved or declined' })
    status: 'approved' | 'declined';

    @ApiProperty({ description: 'Verification result message' })
    message: string;

    @ApiProperty({ description: 'S3 URL of the selfie' })
    selfieUrl: string;

    @ApiProperty({ description: 'S3 URL of the document' })
    documentUrl: string;

    @ApiProperty({ description: 'Extracted document data' })
    documentData: {
        documentNumber: string;
        fullName: string;
        dateOfBirth: string;
        nationality: string;
    };
}
