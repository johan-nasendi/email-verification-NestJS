import {
    BaseEntity,
    BeforeInsert,
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
  } from 'typeorm';
  import { User } from './user.entity';
  import { v4 as uuidv4 } from 'uuid';
  
  @Entity()
  export class Verification extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    code: string;
  
    @OneToOne((type) => User, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;
  
    @BeforeInsert()
    createCode(): void {
      this.code = uuidv4();
    }
  }
  