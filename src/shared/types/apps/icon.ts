import React, { FunctionComponent } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TablerIcon } from '@tabler/icons-react';
import { OverridableComponent } from 'src/shared/components/compat';
import { SvgIconTypeMap } from 'src/shared/components/compat';

export type GeneralIcon =
  | (OverridableComponent<SvgIconTypeMap<{}, 'svg'>> & {
      muiName: string;
    })
  | React.ComponentClass<any>
  | FunctionComponent<any>
  | TablerIcon;
