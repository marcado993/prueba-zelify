import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TextractRequestDto {
    @ApiProperty({
        description: 'User ID for the KYC verification',
        example: 'user-123',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        description: 'Country code for document parsing',
        enum: ['EC', 'MX', 'US', 'CO'],
        example: 'EC',
    })
    @IsString()
    @IsIn(['EC', 'MX', 'US', 'CO'])
    country: 'EC' | 'MX' | 'US' | 'CO';

    @ApiProperty({
        description: 'Document side: front or back',
        enum: ['front', 'back'],
        example: 'front',
        required: false,
        default: 'front',
    })
    @IsString()
    @IsOptional()
    @IsIn(['front', 'back'])
    documentSide?: 'front' | 'back';
}

export class TextractResponseDto {
    @ApiProperty({ description: 'KYC Document ID' })
    id: string;

    @ApiProperty({ description: 'User ID' })
    userId: string;

    @ApiProperty({ description: 'Country code' })
    country: string;

    @ApiProperty({ description: 'Extracted document number' })
    documentNumber: string;

    @ApiProperty({ description: 'Full name extracted from document' })
    fullName: string;

    @ApiProperty({ description: 'First name' })
    firstName: string;

    @ApiProperty({ description: 'Last name' })
    lastName: string;

    @ApiProperty({ description: 'Date of birth' })
    dateOfBirth: string;

    @ApiProperty({ description: 'Document expiration date' })
    expirationDate: string;

    @ApiProperty({ description: 'Nationality' })
    nationality: string;

    @ApiProperty({ description: 'Gender' })
    gender: string;

    @ApiProperty({ description: 'Address' })
    address: string;

    @ApiProperty({ description: 'S3 URL of uploaded document' })
    documentUrl: string;

    @ApiProperty({ description: 'Current KYC status' })
    status: string;

    @ApiProperty({ description: 'Textract confidence score' })
    confidence: number;

    @ApiProperty({ description: 'Processing message' })
    message: string;
}
