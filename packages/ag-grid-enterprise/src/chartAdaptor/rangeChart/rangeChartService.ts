import { 
    Autowired,
    Bean, 
    ChartType,
    CellRangeParams,
    CellRange, 
    Component,
    Context,
    Dialog,
    IEventEmitter,
    IRangeChartService,
    MessageBox 
} from "ag-grid-community";
import { RangeChartDatasource } from "./rangeChartDatasource";
import { RangeController } from "../../rangeController";
import { GridChartComp } from "../gridChartComp";
import { ChartMenu } from "../chartMenu";

export interface ChartDatasource extends IEventEmitter {
    getCategory(i: number): string;
    getFields(): string[];
    getFieldNames(): string[];
    getValue(i: number, field: string): number;
    getRowCount(): number;
    destroy(): void;
    getErrors(): string[];
}

@Bean('rangeChartService')
export class RangeChartService implements IRangeChartService {

    @Autowired('rangeController') private rangeController: RangeController;
    @Autowired('context') private context: Context;

    public chartCurrentRange(chartType: ChartType = ChartType.GroupedBar): void {
        const selectedRange = this.getSelectedRange();
        this.chartRange(selectedRange, chartType);
    }

    public chartCellRange(params: CellRangeParams, chartTypeString: string, container?: HTMLElement): void {
        const cellRange = this.rangeController.createCellRangeFromCellRangeParams(params);

        let chartType: ChartType;
        switch (chartTypeString) {
            case 'groupedBar': chartType = ChartType.GroupedBar; break;
            case 'stackedBar': chartType = ChartType.StackedBar; break;
            case 'pie': chartType = ChartType.Pie; break;
            case 'line': chartType = ChartType.Line; break;
            default: chartType = ChartType.GroupedBar;
        }

        if (cellRange) {
            this.chartRange(cellRange, chartType, container);
        }
    }

    public chartRange(cellRange: CellRange, chartType: ChartType = ChartType.GroupedBar, container?: HTMLElement): void {
        const ds = this.createDatasource(cellRange);

        if (ds) {
            const chart = new GridChartComp(chartType, ds);
            this.context.wireBean(chart);

            if (container) {
                container.appendChild(chart.getGui());
            } else {
                this.createChartDialog(chart);
            }

        } else {
            // TODO: replace with error dialog
            console.warn('ag-Grid: unable to perform charting due to invalid range selection');
        }
    }

    private getSelectedRange(): CellRange {
        const ranges = this.rangeController.getCellRanges();
        return ranges.length > 0 ? ranges[0] : {} as CellRange;
    }

    private createDatasource(range: CellRange): ChartDatasource | null {
        if (!range.columns) { return null; }

        const ds = new RangeChartDatasource(range);
        this.context.wireBean(ds);

        const errors = ds.getErrors();
        if (errors && errors.length > 0) {
            this.addErrorMessageBox(errors);
            return null;
        }

        return ds;
    }

    private createChartDialog(chart: Component): void {
        const chartDialog = new Dialog({
            resizable: true,
            movable: true,
            title: 'Chart',
            component: chart,
            centered: true,
            closable: false
        });

        this.context.wireBean(chartDialog);
        chartDialog.addEventListener(Dialog.EVENT_DESTROYED, () => {
            chart.destroy();
        });

        const menu = new ChartMenu(chart);
        this.context.wireBean(menu);

        chartDialog.addTitleBarButton(menu, 0);
    }

    private addErrorMessageBox(errors: string[]) {
        const errorMessage = errors.join(' ');

        const messageBox = new MessageBox({
            title: 'Cannot Chart',
            message: errorMessage,
            centered: true,
            resizable: false,
            movable: true,
            width: 400,
            height: 150
        });

        this.context.wireBean(messageBox);
    }
}