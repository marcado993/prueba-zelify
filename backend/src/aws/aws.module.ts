import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';
import { TextractService } from './textract.service';
import { RekognitionService } from './rekognition.service';

@Module({
    imports: [ConfigModule],
    providers: [S3Service, TextractService, RekognitionService],
    exports: [S3Service, TextractService, RekognitionService],
})
export class AwsModule { }
