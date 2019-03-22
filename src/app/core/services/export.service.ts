import { Injectable } from '@angular/core';
import { ExportField } from '../models/export-field';
import * as json2csv from 'json2csv';
 
@Injectable()
export class ExportService {
    public exportToCsv(fields: ExportField[], items: any[], fileName: string = "export.csv") {
        try {
            const csv = json2csv.parse(items, { fields });
            this.download(csv, fileName, "application/csv");
        } catch (err) {
            console.error(err);
        }
    } 

    private download(data: any, fileName: string, type: string): void {
        const blob = new Blob([data], { type: type });
        if (window.navigator.msSaveOrOpenBlob) //IE & Edge
        {
            //msSaveBlob only available for IE & Edge
            window.navigator.msSaveBlob(blob, fileName);
        }
        else //Chrome & FF
        {
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor); //For FF
            anchor.click();
            //It's better to remove the elem
            document.body.removeChild(anchor);
            anchor.remove();
        }
    }
}