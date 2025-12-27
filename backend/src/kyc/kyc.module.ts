import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KycDocument } from './entities/kyc-document.entity';
import { AwsModule } from '../aws/aws.module';
import {
    EcuadorIdentityStrategy,
    ColombiaIdentityStrategy,
    MexicoIdentityStrategy,
    USAIdentityStrategy,
} from './strategies';

@Module({
    imports: [
        TypeOrmModule.forFeature([KycDocument]),
        MulterModule.register({
            storage: memoryStorage(),
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB
            },
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/^image\/(jpeg|png|jpg)$/)) {
                    return callback(new Error('Only JPEG and PNG images are allowed'), false);
                }
                callback(null, true);
            },
        }),
        AwsModule,
    ],
    controllers: [KycController],
    providers: [
        KycService,
        EcuadorIdentityStrategy,
        ColombiaIdentityStrategy,
        MexicoIdentityStrategy,
        USAIdentityStrategy,
    ],
    exports: [KycService],
})
export class KycModule { }
