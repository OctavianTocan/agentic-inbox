/**
 * Centralized icon exports. Hugeicons is the primary provider for line icons;
 * local brand SVG components cover logos Hugeicons does not ship.
 *
 * Import icon names from this module. Direct imports of `lucide-react` or
 * `@central-icons-react/*` must not appear elsewhere in the codebase.
 */

import {
  HugeiconsIcon,
  type IconSvgElement,
} from "@hugeicons/react";
import {
  Activity01Icon as HiActivity,
  AiBrowserIcon as HiAiBrowser,
  Alert02Icon as HiAlertTriangle,
  Archive01Icon as HiArchive,
  ArrowDown01Icon as HiArrowDown,
  ArrowDownLeft01Icon as HiArrowDownLeft,
  ArrowLeft01Icon as HiArrowLeft,
  ArrowReloadHorizontalIcon as HiReloadHorizontal,
  ArrowRight01Icon as HiArrowRight,
  ArrowUp01Icon as HiArrowUp,
  ArrowUpRight01Icon as HiArrowUpRight,
  BarChartIcon as HiBarChart,
  Brain01Icon as HiBrain,
  BubbleChatQuestionIcon as HiBubbleChatText,
  Building02Icon as HiBuilding,
  Calendar01Icon as HiCalendar,
  CalendarSetting01Icon as HiCalendarClock,
  Calendar03Icon as HiCalendarDays,
  CallIncoming01Icon as HiCallIncoming,
  Camera01Icon as HiCamera,
  CancelCircleIcon as HiCircleX,
  Cancel01Icon as HiCancel,
  CancelCircleHalfDotIcon as HiStopCircle,
  ChartUpIcon as HiTradeUp,
  CheckmarkBadge01Icon as HiBadgeCheck,
  CheckmarkCircle01Icon as HiCircleCheck,
  CheckmarkSquare01Icon as HiCheckSquare,
  ChevronDownIcon as HiChevronDown,
  ChevronLeftIcon as HiChevronLeft,
  ChevronRightIcon as HiChevronRight,
  ChevronUpIcon as HiChevronUp,
  ChipIcon as HiChip,
  CircleIcon as HiCircle,
  CircleDashedIcon as HiCircleDashed,
  Clock01Icon as HiClock,
  ColorPickerIcon as HiColorPicker,
  CommandIcon as HiCommand,
  ConsoleIcon as HiConsole,
  ContrastIcon as HiContrast,
  Copy01Icon as HiCopy,
  CreditCardIcon as HiCreditCard,
  CrosshairIcon as HiCrosshair,
  CursorPointer01Icon as HiCursorClick,
  DashboardSquare01Icon as HiDashboard,
  Delete02Icon as HiTrash,
  DragDropVerticalIcon as HiDragVertical,
  Edit02Icon as HiEdit,
  FavouriteIcon as HiStar,
  File01Icon as HiFile,
  FileAddIcon as HiFileAdd,
  FileEditIcon as HiFileEdit,
  FilterIcon as HiFilter,
  FilterHorizontalIcon as HiSliders,
  FilterRemoveIcon as HiFilterRemove,
  Flag02Icon as HiFlag,
  FloppyDiskIcon as HiFloppyDisk,
  Folder01Icon as HiFolder,
  FolderOpenIcon as HiFolderOpen,
  GitBranchIcon as HiGitBranch,
  GitMergeIcon as HiGitMerge,
  GitPullRequestIcon as HiGitPullRequest,
  GitPullRequestClosedIcon as HiGitPullRequestClosed,
  HashtagIcon as HiHashtag,
  HierarchyIcon as HiHierarchy,
  HistoryIcon as HiHistory,
  HomeIcon as HiHome,
  ImageIcon as HiImage,
  InboxIcon as HiInbox,
  InboxDownloadIcon as HiInboxDownload,
  InformationCircleIcon as HiInfoCircle,
  Key01Icon as HiKey,
  Key02Icon as HiKeyRound,
  Layers01Icon as HiLayers,
  Layout01Icon as HiLayout,
  LayoutGridIcon as HiLayoutGrid,
  LifebuoyIcon as HiLifebuoy,
  Link01Icon as HiLink,
  LinkSquare01Icon as HiExternalLink,
  Loading01Icon as HiLoading,
  LockIcon as HiLock,
  Logout01Icon as HiLogout,
  Mail01Icon as HiMail,
  Maximize01Icon as HiMaximize,
  Maximize02Icon as HiMaximize2,
  Menu01Icon as HiMenu,
  Message01Icon as HiMessage,
  Minimize01Icon as HiMinimize,
  Minimize03Icon as HiMinimize2,
  MinusSignIcon as HiMinus,
  Moon02Icon as HiMoon,
  MoonEclipseIcon as HiMoonStar,
  MoreHorizontalIcon as HiMoreHorizontal,
  MoreVerticalIcon as HiMoreVertical,
  Notification01Icon as HiNotification,
  Package01Icon as HiPackage,
  PaintBrush02Icon as HiPaintBrush,
  PauseIcon as HiPause,
  PencilIcon as HiPencil,
  PencilEdit01Icon as HiPencilEdit,
  Pin02Icon as HiPin2,
  PinIcon as HiPin,
  PinOffIcon as HiPinOff,
  PlayIcon as HiPlay,
  PlusSignIcon as HiPlusSign,
  PlusSignCircleIcon as HiPlusCircle,
  PuzzleIcon as HiPuzzle,
  QuestionIcon as HiHelpCircle,
  RemoveCircleHalfDotIcon as HiBan,
  Robot01Icon as HiRobot,
  RocketIcon as HiRocket,
  SecurityWarningIcon as HiShieldAlert,
  SentIcon as HiSent,
  Search01Icon as HiSearch,
  ServerStack01Icon as HiServer,
  Settings02Icon as HiSettings,
  Settings01Icon as HiSettingsGear,
  Shield01Icon as HiShield,
  SidebarLeft01Icon as HiSidebarLeft,
  SidebarLeftIcon as HiSidebarLeftClose,
  SidebarRight01Icon as HiSidebarRight,
  SidebarRightIcon as HiSidebarRightClose,
  SmartPhone01Icon as HiSmartPhone,
  SmileIcon as HiSmile,
  SourceCodeIcon as HiSourceCode,
  SparklesIcon as HiSparkles,
  SquareUnlockIcon as HiSquareUnlock,
  Sun01Icon as HiSun,
  TextAlignCenterIcon as HiAlignCenter,
  TextAlignLeftIcon as HiAlignLeft,
  TextAlignRightIcon as HiAlignRight,
  TextBoldIcon as HiBold,
  TextFontIcon as HiText,
  TextItalicIcon as HiItalic,
  TextUnderlineIcon as HiUnderline,
  Tick01Icon as HiCheck,
  TvIcon as HiTv,
  UnfoldMoreIcon as HiUnfoldMore,
  Upload01Icon as HiUpload,
  UserIcon as HiUser,
  UserAdd01Icon as HiUserAdd,
  UserCheck01Icon as HiUserCheck,
  UserEdit01Icon as HiUserEdit,
  UserGroupIcon as HiUserGroup,
  UserSettings01Icon as HiUserSettings,
  ViewSidebarRightIcon as HiViewSidebarRight,
  Wrench01Icon as HiWrench,
  AppWindowIcon as HiAppWindow,
  ClaudeIcon as HiClaude,
  ChatGptIcon as HiChatGpt,
  EnergyIcon as HiEnergy,
  GlobalIcon as HiGlobal,
  LocationOfflineIcon as HiLocationOffline,
  Book02Icon as HiBook,
} from "@hugeicons/core-free-icons";
import type { ComponentProps, ComponentType, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: string | number };
export type Icon = ComponentType<IconProps>;

/** Wraps a Hugeicons data object as an `<svg>`-compatible icon component. */
const hugeicon = (data: IconSvgElement): Icon => {
  const IconComponent = ({ strokeWidth, ...props }: IconProps) => {
    const iconProps: ComponentProps<typeof HugeiconsIcon> = {
      icon: data,
      ...props,
      // HugeiconsIcon narrows strokeWidth to number; drop non-numeric SVG values.
      ...(typeof strokeWidth === "number" ? { strokeWidth } : {}),
    };
    return <HugeiconsIcon {...iconProps} />;
  };
  return IconComponent;
};

export const AlignCenterIcon = hugeicon(HiAlignCenter);
export const AlignLeftIcon = hugeicon(HiAlignLeft);
export const AlignRightIcon = hugeicon(HiAlignRight);
export const AnthropicIcon = hugeicon(HiClaude);
export const ArchiveIcon = hugeicon(HiArchive);
export const BoxIcon = hugeicon(HiArchive);
export const LogOutIcon = hugeicon(HiLogout);
export const MoveDownLeftIcon = hugeicon(HiArrowDownLeft);
export const DownloadIcon = hugeicon(HiInboxDownload);
export const ArrowLeftIcon = hugeicon(HiArrowLeft);
export const UploadIcon = hugeicon(HiUpload);
export const ArrowRightIcon = hugeicon(HiArrowRight);
export const MoveRightIcon = hugeicon(HiArrowRight);
export const RefreshCwIcon = hugeicon(HiReloadHorizontal);
export const RefreshCcwIcon = hugeicon(HiReloadHorizontal);
export const RotateCcwIcon = hugeicon(HiReloadHorizontal);
export const ArrowDownIcon = hugeicon(HiArrowDown);
export const ArrowUpIcon = hugeicon(HiArrowUp);
export const MoveUpRightIcon = hugeicon(HiArrowUpRight);
export const MenuIcon = hugeicon(HiMenu);
export const BellIcon = hugeicon(HiNotification);
export const BlocksIcon = hugeicon(HiPuzzle);
export const BoldIcon = hugeicon(HiBold);
export const BookIcon = hugeicon(HiBook);
export const BracesIcon = hugeicon(HiSourceCode);
export const BrainIcon = hugeicon(HiBrain);
export const GitBranchIcon = hugeicon(HiGitBranch);
export const PaintbrushIcon = hugeicon(HiPaintBrush);
export const MessageSquareIcon = hugeicon(HiMessage);
export const BotMessageSquareIcon = hugeicon(HiBubbleChatText);
export const MessageSquareTextIcon = hugeicon(HiBubbleChatText);
export const Building2Icon = hugeicon(HiBuilding);
export const BuildingIcon = hugeicon(HiBuilding);
export const CalendarIcon = hugeicon(HiCalendar);
export const CalendarClockIcon = hugeicon(HiCalendarClock);
export const CalendarDaysIcon = hugeicon(HiCalendarDays);
export const PhoneCallIcon = hugeicon(HiCallIncoming);
export const CameraIcon = hugeicon(HiCamera);
export const LinkIcon = hugeicon(HiLink);
export const BarChart3Icon = hugeicon(HiBarChart);
export const CheckIcon = hugeicon(HiCheck);
export const ChevronDownIcon = hugeicon(HiChevronDown);
export const ChevronsLeftIcon = hugeicon(HiChevronLeft);
export const ChevronsRightIcon = hugeicon(HiChevronRight);
export const ChevronsUpDownIcon = hugeicon(HiUnfoldMore);
export const ChevronLeftIcon = hugeicon(HiChevronLeft);
export const ChevronRightIcon = hugeicon(HiChevronRight);
export const ChevronUpIcon = hugeicon(HiChevronUp);
export const ChipIcon = hugeicon(HiChip);
export const CircleIcon = hugeicon(HiCircle);
export const BanIcon = hugeicon(HiBan);
export const CircleCheckIcon = hugeicon(HiCircleCheck);
export const CircleDashedIcon = hugeicon(HiCircleDashed);
export const HalfCircleIcon = hugeicon(HiContrast);
export const AlertCircleIcon = hugeicon(HiInfoCircle);
export const InfoIcon = hugeicon(HiInfoCircle);
export const PlusCircleIcon = hugeicon(HiPlusCircle);
export const HelpCircleIcon = hugeicon(HiHelpCircle);
export const OctagonXIcon = hugeicon(HiCircleX);
export const XCircleIcon = hugeicon(HiCircleX);
export const ClockIcon = hugeicon(HiClock);
export const CommandIcon = hugeicon(HiCommand);
export const PaletteIcon = hugeicon(HiColorPicker);
export const TerminalIcon = hugeicon(HiConsole);
export const CreditCardIcon = hugeicon(HiCreditCard);
export const CloseIcon = hugeicon(HiCancel);
export const XIcon = hugeicon(HiCancel);
export const MousePointerClickIcon = hugeicon(HiCursorClick);
export const MoreHorizontalIcon = hugeicon(HiMoreHorizontal);
export const GripVerticalIcon = hugeicon(HiDragVertical);
export const MoreVerticalIcon = hugeicon(HiMoreVertical);
export const EditIcon = hugeicon(HiEdit);
export const ActivityIcon = hugeicon(HiActivity);
export const MailIcon = hugeicon(HiMail);
export const SmileIcon = hugeicon(HiSmile);
export const TriangleAlertIcon = hugeicon(HiAlertTriangle);
export const MaximizeIcon = hugeicon(HiMaximize);
export const Maximize2Icon = hugeicon(HiMaximize2);
export const FileTextIcon = hugeicon(HiFileEdit);
export const FlagIcon = hugeicon(HiFlag);
export const ListFilterIcon = hugeicon(HiFilter);
export const SaveIcon = hugeicon(HiFloppyDisk);
export const FolderIcon = hugeicon(HiFolder);
export const FolderOpenIcon = hugeicon(HiFolderOpen);
export const UsersIcon = hugeicon(HiUserGroup);
export const HashIcon = hugeicon(HiHashtag);
export const HistoryIcon = hugeicon(HiHistory);
export const HomeIcon = hugeicon(HiHome);
export const ImageIcon = hugeicon(HiImage);
export const InboxIcon = hugeicon(HiInbox);
export const ItalicIcon = hugeicon(HiItalic);
export const KeyIcon = hugeicon(HiKey);
export const KeyRoundIcon = hugeicon(HiKeyRound);
export const LayersIcon = hugeicon(HiLayers);
export const LayoutDashboardIcon = hugeicon(HiDashboard);
export const LayoutGridIcon = hugeicon(HiLayoutGrid);
export const PanelsTopLeftIcon = hugeicon(HiLayout);
export const LoaderIcon = hugeicon(HiLoading);
export const LockIcon = hugeicon(HiLock);
export const SearchIcon = hugeicon(HiSearch);
export const WrenchIcon = hugeicon(HiWrench);
export const GitMergeIcon = hugeicon(HiGitMerge);
export const MinimizeIcon = hugeicon(HiMinimize);
export const Minimize2Icon = hugeicon(HiMinimize2);
export const MinusIcon = hugeicon(HiMinus);
export const MoonIcon = hugeicon(HiMoon);
export const SunMoonIcon = hugeicon(HiMoonStar);
export const OpenAiIcon = hugeicon(HiChatGpt);
export const PackageIcon = hugeicon(HiPackage);
export const FilePlusIcon = hugeicon(HiFileAdd);
export const FileIcon = hugeicon(HiFile);
export const SendIcon = hugeicon(HiSent);
export const PauseIcon = hugeicon(HiPause);
export const PencilIcon = hugeicon(HiPencil);
export const SquarePenIcon = hugeicon(HiPencilEdit);
export const UserIcon = hugeicon(HiUser);
export const UserPlusIcon = hugeicon(HiUserAdd);
export const UserCheckIcon = hugeicon(HiUserCheck);
export const UserPenIcon = hugeicon(HiUserEdit);
export const SmartphoneIcon = hugeicon(HiSmartPhone);
export const PinIcon = hugeicon(HiPin);
export const Pin2Icon = hugeicon(HiPin2);
export const PlayIcon = hugeicon(HiPlay);
export const PlusIcon = hugeicon(HiPlusSign);
export const GitPullRequestIcon = hugeicon(HiGitPullRequest);
export const GitPullRequestClosedIcon = hugeicon(HiGitPullRequestClosed);
export const LifeBuoyIcon = hugeicon(HiLifebuoy);
export const BotIcon = hugeicon(HiRobot);
export const RocketIcon = hugeicon(HiRocket);
export const ScriptAiIcon = hugeicon(HiAiBrowser);
export const DatabaseIcon = hugeicon(HiServer);
export const CogIcon = hugeicon(HiSettingsGear);
export const MonitorCogIcon = hugeicon(HiSettingsGear);
export const Settings2Icon = hugeicon(HiSettings);
export const SettingsIcon = hugeicon(HiSettings);
export const SlidersHorizontalIcon = hugeicon(HiSliders);
export const ShieldIcon = hugeicon(HiShield);
export const PanelLeftIcon = hugeicon(HiSidebarLeft);
export const PanelRightSquareIcon = hugeicon(HiViewSidebarRight);
export const PanelRightIcon = hugeicon(HiSidebarRight);
export const SparklesIcon = hugeicon(HiSparkles);
export const ExternalLinkIcon = hugeicon(HiExternalLink);
export const CopyIcon = hugeicon(HiCopy);
export const CheckSquareIcon = hugeicon(HiCheckSquare);
export const StarIcon = hugeicon(HiStar);
export const StopCircleIcon = hugeicon(HiStopCircle);
export const BadgeCheckIcon = hugeicon(HiBadgeCheck);
export const SunIcon = hugeicon(HiSun);
export const CrosshairIcon = hugeicon(HiCrosshair);
export const MonitorIcon = hugeicon(HiTv);
export const TextIcon = hugeicon(HiText);
export const Trash2Icon = hugeicon(HiTrash);
export const TrashIcon = hugeicon(HiTrash);
export const TrendingUpIcon = hugeicon(HiTradeUp);
export const UnderlineIcon = hugeicon(HiUnderline);
export const LockOpenIcon = hugeicon(HiSquareUnlock);
export const UnlockIcon = hugeicon(HiSquareUnlock);
export const PinOffIcon = hugeicon(HiPinOff);
export const PinOff2Icon = hugeicon(HiLocationOffline);
export const UserSettingsIcon = hugeicon(HiUserSettings);
export const AppWindowIcon = hugeicon(HiAppWindow);
export const GlobeIcon = hugeicon(HiGlobal);
export const ZapIcon = hugeicon(HiEnergy);
export const FilterXIcon = hugeicon(HiFilterRemove);
export const NetworkIcon = hugeicon(HiHierarchy);
export const PanelLeftCloseIcon = hugeicon(HiSidebarLeftClose);
export const PanelRightCloseIcon = hugeicon(HiSidebarRightClose);
export const ShieldAlertIcon = hugeicon(HiShieldAlert);

export { GithubIcon } from "./github-icon";
export { GoogleIcon } from "./google-icon";
export { HuggingFaceLogoIcon } from "./hugging-face-logo-icon";
export {
  IntegrationAssetIcon,
  type IntegrationAssetName,
} from "./integration-asset-icon";
export { LinkedinIcon } from "./linkedin-icon";
export { LogoIcon } from "./logo-icon";
export { NotionIcon } from "./notion-icon";
export { SlackIcon } from "./slack-icon";
export { XLogoIcon } from "./x-logo-icon";
export { YCombinatorIcon } from "./y-combinator-icon";
