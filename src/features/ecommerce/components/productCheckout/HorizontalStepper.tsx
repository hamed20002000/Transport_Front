// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as React from 'react';
import { Box } from 'src/shared/components/compat';
import { Stepper } from 'src/shared/components/compat';
import { Step } from 'src/shared/components/compat';
import { StepLabel } from 'src/shared/components/compat';
import { Button } from 'src/shared/components/compat';
import { Link } from 'react-router-dom';

interface Props {
  children: JSX.Element | JSX.Element[];
  steps: any[];
  activeStep: number;
  handleReset: (event: React.SyntheticEvent | Event) => void;
  finalStep: JSX.Element | JSX.Element[];
}

const HorizontalStepper = ({ children, steps, activeStep, handleReset, finalStep }: Props) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => {
          const stepProps = {};
          const labelProps = {};

          return (
            <Step key={label} {...stepProps}>
              <StepLabel {...labelProps}>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      {activeStep === steps.length ? (
        <React.Fragment>
          <Box>{finalStep}</Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
            <Button variant="contained" color="success" component={Link} to="/apps/ecommerce/shop">
              Continue Shopping
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button variant="contained">Download Receipt</Button>
            <Button onClick={handleReset}>Reset</Button>
          </Box>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <Box sx={{ mt: 2, mb: 1 }}>{children}</Box>
        </React.Fragment>
      )}
    </Box>
  );
};

export default HorizontalStepper;
