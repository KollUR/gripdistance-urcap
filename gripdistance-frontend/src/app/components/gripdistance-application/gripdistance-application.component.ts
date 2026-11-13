import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { first } from 'rxjs/operators';
import {
    ApplicationPresenter,
    ApplicationPresenterAPI,
    convertValue,
    LengthUnit,
    RobotSettings,
    Length,
} from '@universal-robots/contribution-api';
import { InputValidator } from '@universal-robots/ui-models';
import { GripDistanceApplicationNode } from './gripdistance-application.node';

@Component({
    templateUrl: './gripdistance-application.component.html',
    styleUrls: ['./gripdistance-application.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class GripDistanceApplicationComponent implements ApplicationPresenter, OnChanges {
    @Input() applicationAPI: ApplicationPresenterAPI;
    unit: LengthUnit = 'mm';
    precision = 2;
    digitLimit = 10;
    numberConstraint = { lowerLimit: 0, upperLimit: 300, unit: 'mm' };
    validators: InputValidator[] = [];
    private _applicationNode: GripDistanceApplicationNode;
    private _robotSettings: RobotSettings;

    protected readonly cd = inject(ChangeDetectorRef);
    protected readonly translateService = inject(TranslateService);

    get applicationNode(): GripDistanceApplicationNode {
        return this._applicationNode;
    }

    @Input()
    set applicationNode(node: GripDistanceApplicationNode) {
        this._applicationNode = node;
        this.cd.detectChanges();
    }

    get robotSettings(): RobotSettings {
        return this._robotSettings;
    }

    @Input()
    set robotSettings(value) {
        this._robotSettings = value;
        this.unit = value.units.LENGTH.symbol as LengthUnit;
        // it is necessary to convert the limits to match the current value unit so the validation works correctly
        // by default the limits are set as mm
        this.numberConstraint.upperLimit = this.convertValueToCurrentUnit({
            value: 300,
            unit: 'mm',
        });
        this.numberConstraint.lowerLimit = this.convertValueToCurrentUnit({
            value: 0,
            unit: 'mm',
        });
        this.translateService.use(this._robotSettings.language);
        this.cd.detectChanges();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.robotSettings) {
            if (!changes?.robotSettings?.currentValue) {
                return;
            }

            if (changes?.robotSettings?.isFirstChange()) {
                if (changes?.robotSettings?.currentValue) {
                    this.translateService.use(changes?.robotSettings?.currentValue?.language);
                }
                this.translateService.setDefaultLang('en');
            }

            this.translateService
                .use(changes?.robotSettings?.currentValue?.language)
                .pipe(first())
                .subscribe(() => {
                    this.updateValidators();
                    this.cd.detectChanges();
                });
        }
    }

    public saveNode() {
        this.applicationAPI.applicationNodeService.updateNode(this.applicationNode);
        this.cd.detectChanges();
    }

    convertValueToCurrentUnit(length: Length): number {
        if (length.unit !== this.unit) {
            return convertValue<Length>(length, this.unit).value;
        }

        return length.value;
    }

    convertValueToOriginalUnit(length: Length) {
        if (length.unit !== this.unit) {
            return convertValue<Length>(length, length.unit).value;
        }

        return length.value;
    }

    saveOpenValue(value: number): void {
        if (this.applicationNode.openDistance.value !== value) {
            const distance = {
                value,
                unit: this.applicationNode.openDistance.unit,
            };
            // since the distance is set at a precise unit, we need to save the value back at that unit
            this.applicationNode.openDistance = {
                ...distance,
                value: this.convertValueToOriginalUnit(distance),
            };
            this.saveNode();
        }
    }

    saveCloseValue(value: number): void {
        if (this.applicationNode.closedDistance.value !== value) {
            const distance = {
                value,
                unit: this.applicationNode.closedDistance.unit,
            };
            // since the distance is set at a precise unit, we need to save the value back at that unit
            this.applicationNode.closedDistance = {
                ...distance,
                value: this.convertValueToOriginalUnit(distance),
            };
            this.saveNode();
        }
    }

    private updateValidators() {
        this.validators = [
            (val) => {
                const { upperLimit } = this.numberConstraint;
                // @ts-expect-error Ignored due to multiple types
                return val <= upperLimit
                    ? null
                    : this.translateService.instant('presenter.gripdistance.validator.exceed_upper_limit', { limit: upperLimit });
            },
            (val) => {
                const lowerLimit = this.numberConstraint.lowerLimit;
                // @ts-expect-error Ignored due to multiple types
                return val >= lowerLimit
                    ? null
                    : this.translateService.instant('presenter.gripdistance.validator.exceed_lower_limit', { limit: lowerLimit });
            },
        ];
        this.cd.detectChanges();
    }

    public validInputRange(): boolean {
        return this.applicationNode.openDistance.value > this.applicationNode.closedDistance.value;
    }
}
