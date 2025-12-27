import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
}

@Injectable()
export class S3Service {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(private configService: ConfigService) {
        const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

        this.s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
        this.bucketName = this.configService.get<string>('AWS_S3_BUCKET') || 'kyc-bucket';
    }

    async uploadFile(
        file: UploadedFile,
        folder: string,
    ): Promise<{ key: string; url: string }> {
        const fileExtension = file.originalname.split('.').pop();
        const key = `${folder}/${uuidv4()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await this.s3Client.send(command);

        const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
        const url = `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;

        return { key, url };
    }

    async getFileBuffer(key: string): Promise<Buffer> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        const response = await this.s3Client.send(command);
        const bodyContents = await response.Body?.transformToByteArray();

        if (!bodyContents) {
            throw new Error('Failed to retrieve file from S3');
        }

        return Buffer.from(bodyContents);
    }

    getBucketName(): string {
        return this.bucketName;
    }
}
