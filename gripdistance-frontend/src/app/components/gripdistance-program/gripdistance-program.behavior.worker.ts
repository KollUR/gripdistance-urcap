/// <reference lib="webworker" />
import {
    ApplicationContext,
    AdvancedTranslatedProgramLabel,
    ProgramBehaviors,
    ProgramNode,
    registerProgramBehavior,
    ScriptBuilder,
    ScriptContext,
    ValidationContext,
    ValidationResponse,
} from '@universal-robots/contribution-api';
import { GripDistanceApplicationNode } from '../gripdistance-application/gripdistance-application.node';
import { GripDistanceProgramNode } from './gripdistance-program.node';

const createProgramNodeLabel = (node: GripDistanceProgramNode): AdvancedTranslatedProgramLabel => {
    return [
        {
            type: 'primary',
            translationKey: 'program-node-labels.gripdistance.toggle',
        },
        {
            type: 'secondary',
            translationKey: `program-node-labels.gripdistance.state`,
            interpolateParams: { state: node.parameters.gripperToggle.toString() },
        },
    ];
};

const createGripDistanceProgramNode = (): GripDistanceProgramNode => ({
    type: 'ur-sample-gripdistance-program',
    version: '1.0.0', // version is required
    allowsChildren: false,
    parameters: {
        closedDistance: { value: 0, unit: 'mm' },
        openDistance: { value: 300, unit: 'mm' },
        gripperToggle: false,
    },
});

const generateCode = (
    node: GripDistanceProgramNode,
    scriptContext: ScriptContext,
    applicationContext: ApplicationContext,
): ScriptBuilder => {
    const applicationNode = applicationContext.contributions.getContribution(
        'ur-sample-gripdistance-application',
    ) as GripDistanceApplicationNode;
    const builder = new ScriptBuilder();
    if (node.parameters && Object.prototype.hasOwnProperty.call(node.parameters, 'gripperToggle') && applicationNode) {
        const gripDistance = node.parameters.gripperToggle ? applicationNode.openDistance.value : applicationNode.closedDistance.value;
        builder.addRaw(`setGripper(${gripDistance})`);
    }
    return builder;
};

const nodeValidation = (
    node: GripDistanceProgramNode,
    _context: ValidationContext,
    applicationContext: ApplicationContext,
): ValidationResponse => {
    const applicationNode = applicationContext.contributions.getContribution(
        'ur-sample-gripdistance-application',
    ) as GripDistanceApplicationNode;
    const hasValidParameters = node.parameters && Object.prototype.hasOwnProperty.call(node.parameters, 'gripperToggle');
    const hasValidRange = applicationNode ? applicationNode.openDistance.value > applicationNode.closedDistance.value : false;
    return hasValidParameters && hasValidRange
        ? { isValid: true }
        : { isValid: false, errorMessageKey: 'Missing required parameters' };
};

// Add upgrade implementation here
const nodeUpgrade = (loadedNode: ProgramNode): ProgramNode => loadedNode;

const behaviors: ProgramBehaviors = {
    programNodeLabel: createProgramNodeLabel,
    factory: createGripDistanceProgramNode,
    generateCodeBeforeChildren: generateCode,
    validator: nodeValidation,
    upgradeNode: nodeUpgrade,
};

registerProgramBehavior(behaviors);
