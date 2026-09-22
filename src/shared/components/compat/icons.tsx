/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Icons from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { forwardUI, useStyles, useTheme, domProps } from 'src/shared/components/compat/system';

function icon(Component: Icons.LucideIcon) {
  return forwardUI<SVGSVGElement>(
    ({ sx, fontSize, color, htmlColor, className, ...props }, ref) => {
      const theme = useTheme();
      const style = useStyles(sx);
      return (
        <Component
          ref={ref}
          {...domProps(props)}
          size={
            props.size ??
            (fontSize === 'small'
              ? 18
              : fontSize === 'large'
                ? 32
                : fontSize === 'inherit'
                  ? '1em'
                  : 24)
          }
          color={htmlColor || theme.palette[color]?.main || color}
          className={cn('UiSvgIcon-root', className, style)}
        />
      );
    },
  );
}
export const ArrowUpwardOutlined = icon(Icons.ArrowUp);
export const AspectRatioTwoTone = icon(Icons.Maximize);
export const AssignmentTurnedIn = icon(Icons.ClipboardCheck);
export const Bolt = icon(Icons.Zap);
export const BorderOuter = icon(Icons.SquareDashed);
export const Business = icon(Icons.Building2);
export const CallToActionTwoTone = icon(Icons.PanelBottom);
export const Cancel = icon(Icons.CircleX);
export const CancelRounded = Cancel;
export const CheckBox = icon(Icons.SquareCheck);
export const CheckBoxOutlineBlank = icon(Icons.Square);
export const CheckCircle = icon(Icons.CircleCheck);
export const CheckCircleOutline = CheckCircle;
export const Close = icon(Icons.X);
export const DarkModeTwoTone = icon(Icons.Moon);
export const DirectionsCarFilledRounded = icon(Icons.Car);
export const DoNotDisturbOnRounded = icon(Icons.CircleMinus);
export const Done = icon(Icons.Check);
export const DoneRounded = Done;
export const Edit = icon(Icons.Pencil);
export const ExpandLess = icon(Icons.ChevronUp);
export const ExpandMore = icon(Icons.ChevronDown);
export const Favorite = icon(Icons.Heart);
export const FavoriteBorder = Favorite;
export const FirstPage = icon(Icons.ChevronsLeft);
export const GraphicEq = icon(Icons.AudioLines);
export const HighlightOff = Cancel;
export const KeyboardArrowDown = ExpandMore;
export const KeyboardArrowLeft = icon(Icons.ChevronLeft);
export const KeyboardArrowRight = icon(Icons.ChevronRight);
export const KeyboardArrowUp = ExpandLess;
export const Language = icon(Icons.Globe);
export const LastPage = icon(Icons.ChevronsRight);
export const List = icon(Icons.List);
export const Mic = icon(Icons.Mic);
export const PaddingTwoTone = icon(Icons.Space);
export const Person = icon(Icons.UserRound);
export const Phone = icon(Icons.Phone);
export const SaveAs = icon(Icons.Save);
export const Send = icon(Icons.Send);
export const SentimentDissatisfied = icon(Icons.Frown);
export const SentimentSatisfied = icon(Icons.Meh);
export const SentimentSatisfiedAltOutlined = icon(Icons.Smile);
export const SentimentVeryDissatisfied = icon(Icons.Angry);
export const SentimentVerySatisfied = icon(Icons.Laugh);
export const SmartToyOutlined = icon(Icons.Bot);
export const Stop = icon(Icons.Square);
export const StopCircleSharp = icon(Icons.CircleStop);
export const SwipeLeftAltTwoTone = icon(Icons.ArrowLeft);
export const SwipeRightAltTwoTone = icon(Icons.ArrowRight);
export const ThumbDownAlt = icon(Icons.ThumbsDown);
export const ThumbUpAlt = icon(Icons.ThumbsUp);
export const TrendingFlat = icon(Icons.ArrowRight);
export const ViewComfyTwoTone = icon(Icons.LayoutGrid);
export const ViewSidebarTwoTone = icon(Icons.PanelLeft);
export const Visibility = icon(Icons.Eye);
export const VisibilityOff = icon(Icons.EyeOff);
export const WbSunnyTwoTone = icon(Icons.Sun);
export const WebAssetTwoTone = icon(Icons.PanelTop);
