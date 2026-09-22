// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import PageContainer from 'src/shared/components/container/PageContainer';

// components
import Banner from 'src/features/landing/components/banner/Banner';
import C2a from 'src/features/landing/components/c2a/C2a';
import C2a2 from 'src/features/landing/components/c2a/C2a2';
import DemoSlider from 'src/features/landing/components/demo-slider/DemoSlider';
import Features from 'src/features/landing/components/features/Features';
import Footer from 'src/features/landing/components/footer/Footer';
import Frameworks from 'src/features/landing/components/frameworks/Frameworks';
import LpHeader from 'src/features/landing/components/header/Header';
import Testimonial from 'src/features/landing/components/testimonial/Testimonial';

const Landingpage = () => {
  return (
    <PageContainer title="Landingpage" description="this is Landingpage">
      <LpHeader />
      <Banner />
      <DemoSlider />
      <Frameworks />
      <Testimonial />
      <Features />
      <C2a />
      <C2a2 />
      <Footer />
    </PageContainer>
  );
};

export default Landingpage;
