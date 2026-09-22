// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { sum } from 'lodash';
import { Box, Stack, Button } from 'src/shared/components/compat';
import AddToCart from 'src/features/ecommerce/components/productCart/AddToCart';

import { IconArrowBack } from '@tabler/icons-react';
import { useSelector } from 'src/app/store';
import HorizontalStepper from 'src/features/ecommerce/components/productCheckout/HorizontalStepper';
import FirstStep from 'src/features/ecommerce/components/productCheckout/FirstStep';
import SecondStep from 'src/features/ecommerce/components/productCheckout/SecondStep';
import ThirdStep from 'src/features/ecommerce/components/productCheckout/ThirdStep';
import FinalStep from 'src/features/ecommerce/components/productCheckout/FinalStep';
import { ProductType } from 'src/features/ecommerce/types';

const ProductChecout = () => {
  const checkout = useSelector((state) => state.ecommerceReducer.cart);
  const steps = ['Cart', 'Billing & address', 'Payment'];
  const [activeStep, setActiveStep] = React.useState(0);
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  const handleReset = () => {
    setActiveStep(0);
  };

  const total = sum(checkout.map((product: ProductType) => product.price * product.qty));
  const Discount = Math.round(total * (5 / 100));

  return (
    <Box>
      <HorizontalStepper
        steps={steps}
        handleReset={handleReset}
        activeStep={activeStep}
        finalStep={<FinalStep />}
      >
        {activeStep === 0 ? (
          <>
            <Box my={3}>
              <AddToCart />
            </Box>
            {checkout.length > 0 ? (
              <>
                <FirstStep total={total} Discount={Discount} />
                <Stack direction={'row'} justifyContent="space-between">
                  <Button
                    color="secondary"
                    variant="contained"
                    disabled={activeStep === 0}
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                  <Button variant="contained" onClick={handleNext}>
                    Checkout
                  </Button>
                </Stack>
              </>
            ) : (
              ''
            )}
          </>
        ) : activeStep === 1 ? (
          <>
            <SecondStep nexStep={handleNext} />
            <FirstStep total={total} Discount={Discount} />
            <Stack direction={'row'} justifyContent="space-between">
              <Button color="inherit" disabled={activeStep !== 1} onClick={handleBack}>
                Back
              </Button>
              <Button color="inherit" variant="outlined">
                Select Address to go next
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <ThirdStep />
            <FirstStep total={total} Discount={Discount} />
            <Stack direction={'row'} justifyContent="space-between">
              <Button color="inherit" disabled={activeStep === 0} onClick={handleBack}>
                <IconArrowBack /> Back
              </Button>
              <Button onClick={handleNext} size="large" variant="contained">
                Complete an Order
              </Button>
            </Stack>
          </>
        )}
      </HorizontalStepper>
    </Box>
  );
};

export default ProductChecout;
