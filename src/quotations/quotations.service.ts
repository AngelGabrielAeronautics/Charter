import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quotation } from 'src/quotations/quotation.schema';
import { CreateQuotationDto } from './dto/createQuotation.dto';
import { UpdateQuotationDto } from './dto/updateQuotation.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { QuotationStatusEvent } from 'src/events/quotation-events';
import { IQuotation } from './quotation.model';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as moment from 'moment';

@Injectable()
export class QuotationsService {

    constructor(
        @InjectModel(Quotation.name) private model: Model<Quotation>,
        private readonly eventEmitter: EventEmitter2
    ) { }

    create(dto: CreateQuotationDto) {
        const quotation = new this.model(dto);
        return quotation.save();
    }

    findAll() {
        return this.model.find().populate(['operatorId', 'aircraftId']);
    }

    findOne(id: string) {
        return this.model.findById(id).populate(['operatorId', 'aircraftId']);
    }

    async update(id: string, dto: UpdateQuotationDto) {

        if (dto.status !== undefined && dto.status === "Accepted") {
            const previousState = await this.model.findById(id);

            if (previousState.status === 'Accepted') {
                throw new HttpException('This quotation has already been accepted', HttpStatus.FORBIDDEN);
            }

            const quotation: IQuotation = previousState as unknown as IQuotation;
            quotation.status = 'Accepted';
            this.eventEmitter.emit('quotation.status', new QuotationStatusEvent(quotation));

            return await this.model.findByIdAndUpdate(id, dto, { new: true });
        }

        return await this.model.findByIdAndUpdate(id, dto, { new: true });
    }

    findByFilter(filter: any) {
        return this.model.find(filter).populate(['operatorId', 'aircraftId']);
    }

    @OnEvent('quotation.status', { async: true })
    async onQuotationRequestStatusEvent(payload: QuotationStatusEvent) {
        console.log("[ quotation.status - quotations ] Triggered");

        if (payload.quotation.status === "Accepted") {

            const submittedQuotations = await this.model
                .find({ quotationRequestId: payload.quotation.quotationRequestId });

            const items = []

            for (let i = 0; i < submittedQuotations.length; i++) {
                const isEqualTo = (submittedQuotations[i]._id.toString() === payload.quotation._id.toString());
                if (!isEqualTo) {
                    items.push(submittedQuotations[i]);
                }
            }
            const writeOperations = items.map((item) => {
                return {
                    updateOne: {
                        filter: { _id: item._id },
                        update: { status: 'Rejected' }
                    }
                };
            });

            await this.model.bulkWrite(writeOperations);
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleQuotationsCron() {
        console.log('Running handleQuotationsCron()');
        const now = moment()

        const quotations = await this.model
            .find({
                status: 'Submitted',
            });

        const items: string[] = [];
        for (let i = 0; i < quotations.length; i++) {
            const quotation = quotations[i];
            const departureDate = moment(quotation.expirationDate);
            const isExpired = departureDate.isSameOrAfter(now);
            console.log(isExpired, quotation.expirationDate);

            if (isExpired) items.push(quotation._id.toString());
        }

        const writeOperations = items.map((item) => {
            return {
                updateOne: {
                    filter: { _id: item },
                    update: { status: 'Rejected' }
                }
            };
        });

        await this.model.bulkWrite(writeOperations);
    }

}
