// StepIndicator component for CreateAreaScreen

import React from 'react';
import { View, Text } from 'react-native';
import { stepIndicatorStyle } from './styles';

export const StepIndicator = ({ currentDisplayStep, totalSteps }) => {
    return (
        <View style={stepIndicatorStyle.container}>
            {Array.from({ length: totalSteps }, (_, i) => {
                const stepNumber = i + 1;
                let isActive = stepNumber === currentDisplayStep;
                let isCompleted = stepNumber < currentDisplayStep;

                return (
                    <View key={stepNumber} style={stepIndicatorStyle.step}>
                        <View style={[
                            stepIndicatorStyle.circle,
                            isActive && stepIndicatorStyle.activeCircle,
                            isCompleted && stepIndicatorStyle.completedCircle
                        ]}>
                            <Text style={[
                                stepIndicatorStyle.stepText,
                                (isActive || isCompleted) && stepIndicatorStyle.activeStepText
                            ]}>
                                {stepNumber}
                            </Text>
                        </View>
                        {i < totalSteps - 1 && (
                            <View style={[
                                stepIndicatorStyle.line,
                                isCompleted && stepIndicatorStyle.completedLine
                            ]} />
                        )}
                    </View>
                );
            })}
        </View>
    );
};
