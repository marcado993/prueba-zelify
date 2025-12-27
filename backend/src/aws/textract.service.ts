import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    TextractClient,
    AnalyzeDocumentCommand,
    FeatureType,
    Block,
} from '@aws-sdk/client-textract';

@Injectable()
export class TextractService {
    private textractClient: TextractClient;

    constructor(private configService: ConfigService) {
        const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

        this.textractClient = new TextractClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    async analyzeDocumentFromS3(bucketName: string, s3Key: string): Promise<Block[]> {
        console.log(`Textract analyzing: bucket=${bucketName}, key=${s3Key}`);

        const command = new AnalyzeDocumentCommand({
            Document: {
                S3Object: {
                    Bucket: bucketName,
                    Name: s3Key,
                },
            },
            FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
        });

        try {
            const response = await this.textractClient.send(command);
            console.log(`Textract complete. Blocks: ${response.Blocks?.length || 0}`);
            return response.Blocks || [];
        } catch (error) {
            console.error('Textract error:', {
                name: error.name,
                message: error.message,
            });
            throw error;
        }
    }
}
