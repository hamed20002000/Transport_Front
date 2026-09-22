// project imports
import 'src/app/theme/DefaultColors';
import { Theme } from 'src/shared/components/compat';

const components: any = (theme: Theme) => {
  return {
    UiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          height: '100%',
          width: '100%',
        },
        a: {
          textDecoration: 'none',
        },
        body: {
          height: '100%',
          margin: 0,
          padding: 0,
        },
        '#root': {
          height: '100%',
        },
        "*[dir='rtl'] .buyNowImg": {
          transform: 'scaleX(-1)',
        },
        '.border-none': {
          border: '0px',
          td: {
            border: '0px',
          },
        },
        '.btn-xs': {
          minWidth: '30px !important',
          width: '30px',
          height: '30px',
          borderRadius: '6px !important',
          padding: '0px !important',
        },
        '.hover-text-primary:hover .text-hover': {
          color: theme.palette.primary.main,
        },
        '.hoverCard:hover': {
          scale: '1.01',
          transition: ' 0.1s ease-in',
        },
        '.signup-bg': {
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
        },
        '.UiBox-root': {
          borderRadius: theme.shape.borderRadius,
        },
        '.UiCardHeader-action': {
          alignSelf: 'center !important',
        },
        '.emoji-picker-react .emoji-scroll-wrapper': {
          overflowX: 'hidden',
        },
        '.scrollbar-container': {
          borderRight: '0 !important',
        },
        '.theme-timeline .UiTimelineOppositeContent-root': {
          minWidth: '90px',
        },
        '.UiAlert-root .UiAlert-icon': {
          color: 'inherit!important',
        },
        '.UiTimelineConnector-root': {
          width: '1px !important',
        },
        ' .simplebar-scrollbar:before': {
          background: `${theme.palette.grey[300]} !important`,
        },
        '@keyframes gradient': {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: ' 100% 50%',
          },
          '100% ': {
            backgroundPosition: ' 0% 50%',
          },
        },
        '@keyframes slide': {
          '0%': {
            transform: 'translate3d(0, 0, 0)',
          },
          '100% ': {
            transform: 'translate3d(-2086px, 0, 0)',
          },
        },
        '.rounded-bars .apexcharts-bar-series.apexcharts-plot-series .apexcharts-series path': {
          clipPath: 'inset(0 0 5% 0 round 20px)',
        },
      },
    },
    UiButtonGroup: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    UiAccordion: {
      styleOverrides: {
        root: {
          ':before': {
            backgroundColor: theme.palette.grey[100],
          },
        },
      },
    },
    UiPaper: {
      styleOverrides: {
        root: {
          // border: `1px solid ${theme.palette.divider}`,
          backgroundImage: 'none',
        },
      },
    },
    UiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: theme.palette.divider,
        },
      },
    },
    UiFab: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
        sizeSmall: {
          width: 30,
          height: 30,
          minHeight: 30,
        },
      },
    },
    UiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          boxShadow: 'none',
        },
        text: {
          padding: '5px 15px',
        },
        textPrimary: {
          backgroundColor: theme.palette.primary.light,
          '&:hover': {
            backgroundColor: theme.palette.primary.main,
            color: 'white',
          },
        },
        textSecondary: {
          backgroundColor: theme.palette.secondary.light,
          '&:hover': {
            backgroundColor: theme.palette.secondary.main,
            color: 'white',
          },
        },
        textSuccess: {
          backgroundColor: theme.palette.success.light,
          '&:hover': {
            backgroundColor: theme.palette.success.main,
            color: 'white',
          },
        },
        textError: {
          backgroundColor: theme.palette.error.light,
          '&:hover': {
            backgroundColor: theme.palette.error.main,
            color: 'white',
          },
        },
        textInfo: {
          backgroundColor: theme.palette.info.light,
          '&:hover': {
            backgroundColor: theme.palette.info.main,
            color: 'white',
          },
        },
        textWarning: {
          backgroundColor: theme.palette.warning.light,
          '&:hover': {
            backgroundColor: theme.palette.warning.main,
            color: 'white',
          },
        },
        outlinedPrimary: {
          '&:hover': {
            backgroundColor: theme.palette.primary.main,
            color: 'white',
          },
        },
        outlinedSecondary: {
          '&:hover': {
            backgroundColor: theme.palette.secondary.main,
            color: 'white',
          },
        },
        outlinedError: {
          '&:hover': {
            backgroundColor: theme.palette.error.main,
            color: 'white',
          },
        },
        outlinedSuccess: {
          '&:hover': {
            backgroundColor: theme.palette.success.main,
            color: 'white',
          },
        },
        outlinedInfo: {
          '&:hover': {
            backgroundColor: theme.palette.info.main,
            color: 'white',
          },
        },
        outlinedWarning: {
          '&:hover': {
            backgroundColor: theme.palette.warning.main,
            color: 'white',
          },
        },
      },
    },
    UiCardHeader: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
        title: {
          fontSize: '1.125rem',
        },
      },
    },
    UiCard: {
      styleOverrides: {
        root: {
          width: '100%',
          padding: '15px',
          backgroundImage: 'none',
        },
      },
    },
    UiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
        },
      },
    },
    UiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
      },
    },
    UiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': {
            borderBottom: 0,
          },
        },
      },
    },
    UiGridItem: {
      styleOverrides: {
        root: {
          paddingTop: '30px',
          paddingLeft: '30px !important',
        },
      },
    },
    UiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.grey[200],
          borderRadius: '6px',
        },
      },
    },
    UiTimelineConnector: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.divider,
        },
      },
    },
    UiDivider: {
      styleOverrides: {
        root: {
          borderColor: theme.palette.divider,
        },
      },
    },

    UiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    UiAlert: {
      styleOverrides: {
        filledSuccess: {
          color: 'white',
        },
        filledInfo: {
          color: 'white',
        },
        filledError: {
          color: 'white',
        },
        filledWarning: {
          color: 'white',
        },
        standardSuccess: {
          backgroundColor: theme.palette.success.light,
          color: theme.palette.success.main,
        },
        standardError: {
          backgroundColor: theme.palette.error.light,
          color: theme.palette.error.main,
        },
        standardWarning: {
          backgroundColor: theme.palette.warning.light,
          color: theme.palette.warning.main,
        },
        standardInfo: {
          backgroundColor: theme.palette.info.light,
          color: theme.palette.info.main,
        },
        outlinedSuccess: {
          borderColor: theme.palette.success.main,
          color: theme.palette.success.main,
        },
        outlinedWarning: {
          borderColor: theme.palette.warning.main,
          color: theme.palette.warning.main,
        },
        outlinedError: {
          borderColor: theme.palette.error.main,
          color: theme.palette.error.main,
        },
        outlinedInfo: {
          borderColor: theme.palette.info.main,
          color: theme.palette.info.main,
        },
        successIcon: {
          color: theme.palette.info.main,
        },
      },
    },
    UiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .UiOutlinedInput-notchedOutline': {
            borderColor:
              theme.palette.mode === 'dark' ? theme.palette.grey[200] : theme.palette.grey[300],
          },
          '&:hover .UiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.grey[300],
          },
        },
        input: {
          padding: '12px 14px',
        },
        inputSizeSmall: {
          padding: '8px 14px',
        },
      },
    },
    UiTooltip: {
      styleOverrides: {
        tooltip: {
          color: theme.palette.background.paper,
          background: theme.palette.text.primary,
        },
      },
    },
    UiDrawer: {
      styleOverrides: {
        paper: {
          borderColor: `${theme.palette.divider}`,
        },
      },
    },
    UiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
        },
      },
    },
    UiPopover: {
      styleOverrides: {
        paper: {
          boxShadow:
            'rgb(145 158 171 / 30%) 0px 0px 2px 0px, rgb(145 158 171 / 12%) 0px 12px 24px -4px',
        },
      },
    },
  };
};
export default components;
