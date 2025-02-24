import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { IAirport } from "src/airports/airport.model";
import { IAuditFields } from "src/models/audit-fields.model";
import { IUser } from "src/users/user.model";

export type QuotationRequestDocument = HydratedDocument<QuotationRequest>;

@Schema()
export class QuotationRequest{

    @Prop({ required: true })
    quotationRequestNumber: string; // e.g QR-20240716-010

    @Prop({ required: true })
    status: "Fulfilled" | "Pending" | "Quoted" | "Cancelled";

    @Prop({ required: true, type: Object })
    departureAirport: IAirport;

    @Prop({ required: true, type: Object })
    arrivalAirport: IAirport;

    @Prop({ required: true })
    dateOfDeparture: Date;

    @Prop({ required: true })
    timeOfDeparture: string;

    @Prop({ required: true, type: Object })
    customer: IUser;

    @Prop({ required: true })
    numberOfPassengers: number;

    @Prop({ required: true })
    numberOfAdults: number;

    @Prop({ required: true })
    numberOfChildren: number;

    @Prop({ required: true })
    numberOfInfants: number;

    @Prop({ required: true })
    petsAllowed: boolean;

    @Prop({ required: true })
    smokingAllowed: boolean;

    @Prop({ required: true, type: Object })
    auditFields: IAuditFields;
}

export const QuotationRequestSchema = SchemaFactory.createForClass(QuotationRequest);