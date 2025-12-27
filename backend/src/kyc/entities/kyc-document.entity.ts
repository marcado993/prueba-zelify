import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export type KycStatus = 'pending' | 'document_uploaded' | 'approved' | 'declined';

@Entity('kyc_documents')
export class KycDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    country: string;

    @Column({ nullable: true })
    documentNumber: string;

    @Column({ nullable: true })
    fullName: string;

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    lastName: string;

    @Column({ nullable: true })
    dateOfBirth: string;

    @Column({ nullable: true })
    expirationDate: string;

    @Column({ nullable: true })
    nationality: string;

    @Column({ nullable: true })
    gender: string;

    @Column({ nullable: true })
    address: string;

    @Column()
    documentS3Key: string;

    @Column({ nullable: true })
    documentS3Url: string;

    @Column({ nullable: true })
    selfieS3Key: string;

    @Column({ nullable: true })
    selfieS3Url: string;

    @Column({ default: 'pending' })
    status: KycStatus;

    @Column({ type: 'float', nullable: true })
    similarityScore: number;

    @Column({ type: 'float', nullable: true })
    textractConfidence: number;

    @Column({ nullable: true })
    verificationMessage: string;

    @Column({ type: 'text', nullable: true })
    rawExtractedText: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
