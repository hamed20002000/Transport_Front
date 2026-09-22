import { useTheme as useCardTheme } from 'src/shared/components/compat';
import { Card } from 'src/shared/components/compat';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { useTheme } from 'src/shared/components/compat';

type Props = {
  className?: string;
  children: JSX.Element | JSX.Element[];
  sx?: any;
};

const BlankCard = ({ children, className, sx }: Props) => {
  const isCardShadow = useCardTheme().cardShadow ?? true;

  const theme = useTheme();
  const borderColor = theme.palette.divider;

  return (
    <Card
      sx={{ p: 0, border: !isCardShadow ? `1px solid ${borderColor}` : 'none' , position: 'relative', sx }}
      className={className}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      {children}
    </Card>
  );
};

export default BlankCard;
