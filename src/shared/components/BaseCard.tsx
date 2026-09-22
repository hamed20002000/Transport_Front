import { useTheme as useCardTheme } from 'src/shared/components/compat';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';

import { Card, CardHeader, CardContent, Divider } from 'src/shared/components/compat';

type Props = {
  title: string;
  children: JSX.Element | JSX.Element[];
};

const BaseCard = ({ title, children }: Props) => {
  const isCardShadow = useCardTheme().cardShadow ?? true;

  return (
    <Card
      sx={{ padding: 0 }}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      <CardHeader title={title} />
      <Divider />
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default BaseCard;
