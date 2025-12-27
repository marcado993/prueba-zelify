import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    RekognitionClient,
    CompareFacesCommand,
    CompareFacesMatch,
} from '@aws-sdk/client-rekognition';
import { S3Service } from './s3.service';

export interface FaceComparisonResult {
    isMatch: boolean;
    similarity: number;
    confidence: number;
    message: string;
    faceDetails?: {
        sourceImageFace: {
            boundingBox: unknown;
            confidence: number;
        };
        matchedFace?: CompareFacesMatch;
    };
}

@Injectable()
export class RekognitionService {
    private rekognitionClient: RekognitionClient;
    private similarityThreshold: number;

    constructor(
        private configService: ConfigService,
        private s3Service: S3Service,
    ) {
        const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

        this.rekognitionClient = new RekognitionClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
        const thresholdStr = this.configService.get<string>('REKOGNITION_SIMILARITY_THRESHOLD') || '85';
        this.similarityThreshold = parseFloat(thresholdStr);
    }

    async compareFaces(
        sourceS3Key: string,
        targetS3Key: string,
        customThreshold?: number,
    ): Promise<FaceComparisonResult> {
        const threshold = customThreshold || this.similarityThreshold;
        const bucketName = this.s3Service.getBucketName();

        try {
            const command = new CompareFacesCommand({
                SourceImage: {
                    S3Object: {
                        Bucket: bucketName,
                        Name: sourceS3Key,
                    },
                },
                TargetImage: {
                    S3Object: {
                        Bucket: bucketName,
                        Name: targetS3Key,
                    },
                },
                SimilarityThreshold: threshold,
            });

            const response = await this.rekognitionClient.send(command);

            if (response.FaceMatches && response.FaceMatches.length > 0) {
                const bestMatch = response.FaceMatches[0];
                const similarity = bestMatch.Similarity || 0;
                const isMatch = similarity >= threshold;

                return {
                    isMatch,
                    similarity,
                    confidence: bestMatch.Face?.Confidence || 0,
                    message: isMatch
                        ? `Face verification successful. Similarity: ${similarity.toFixed(2)}%`
                        : `Face verification failed. Similarity: ${similarity.toFixed(2)}% is below threshold of ${threshold}%`,
                    faceDetails: {
                        sourceImageFace: {
                            boundingBox: response.SourceImageFace?.BoundingBox,
                            confidence: response.SourceImageFace?.Confidence || 0,
                        },
                        matchedFace: bestMatch,
                    },
                };
            }

            // No face matches found
            if (response.UnmatchedFaces && response.UnmatchedFaces.length > 0) {
                return {
                    isMatch: false,
                    similarity: 0,
                    confidence: 0,
                    message: 'Faces detected but no match found. The faces appear to be different people.',
                };
            }

            return {
                isMatch: false,
                similarity: 0,
                confidence: 0,
                message: 'No faces detected in one or both images.',
            };
        } catch (error: unknown) {
            const errorWithName = error as { name?: string };
            if (errorWithName.name === 'InvalidParameterException') {
                return {
                    isMatch: false,
                    similarity: 0,
                    confidence: 0,
                    message: 'Could not detect a face in one or both images. Please ensure the images contain clear, visible faces.',
                };
            }
            throw error;
        }
    }
}
