import { useState, type ReactNode } from "react";
import { PlusCircle, Bot, FolderTree, Sliders } from "lucide-react";
import {
  Box, Typography, Chip, IconButton, Button
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { DURATIONS, EASING } from "../../theme/motionTokens";
import { lightTokens, darkTokens } from "../../theme/designTokens";
import { MONO_FONT } from "../../theme/typography";

interface SidebarNavProps {
  agentIds: string[];
  categoryIds: string[];
  miscSectionNames: string[];
  agentModelMap: Record<string, string | undefined>;
  categoryModelMap: Record<string, string | undefined>;
  onNavToAgent: (id: string) => void;
  onNavToCategory: (id: string) => void;
  onNavToMisc: (name: string) => void;
  onNavToSection?: (section: "agents" | "categories" | "misc") => void;
  onOpenAgentDialog: () => void;
  onOpenCategoryDialog: () => void;
  onOpenMiscDialog?: () => void;
  variant?: "desktop" | "mobile";
  onCloseMobile?: () => void;
}

export function SidebarNav({
  agentIds,
  categoryIds,
  miscSectionNames,
  agentModelMap,
  categoryModelMap,
  onNavToAgent,
  onNavToCategory,
  onNavToMisc,
  onNavToSection,
  onOpenAgentDialog,
  onOpenCategoryDialog,
  onOpenMiscDialog,
  variant = "desktop",
  onCloseMobile,
}: SidebarNavProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;

  const agentColor = tokens.colors.section.agentPrimary;
  const categoryColor = tokens.colors.section.categoryPrimary;
  const miscColor = tokens.colors.section.miscPrimary;

  const sectionColors = {
    agent: agentColor,
    category: categoryColor,
    misc: miscColor,
  };

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleNavClick = (id: string, callback?: () => void) => {
    setActiveId(id);
    if (callback) callback();
    onCloseMobile?.();
  };

  const handleSectionClick = (section: "agents" | "categories" | "misc") => {
    setActiveId(`section-${section}`);
    onNavToSection?.(section);
    onCloseMobile?.();
  };

  const navItemTransition = `all ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`;

  const getQuickCreateLabel = (section: string) => `Create ${section.toLowerCase()}`;

  const scrollbarStyles = {
    "&::-webkit-scrollbar": {
      width: 6,
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: tokens.colors.sidebar.scrollbarThumb,
      borderRadius: 3,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: tokens.colors.neutral.textSecondary,
    },
    scrollbarWidth: "thin",
    scrollbarColor: `${tokens.colors.sidebar.scrollbarThumb} transparent`,
  };

  const SectionHeader = ({
    icon,
    label,
    count,
    color,
    onQuickCreate,
    onClick,
    isActive,
    testId,
    quickCreateTestId,
  }: {
    icon: ReactNode;
    label: string;
    count: number;
    color: string;
    onQuickCreate?: () => void;
    onClick?: () => void;
    isActive?: boolean;
    testId?: string;
    quickCreateTestId?: string;
  }) => (
    <Box
      data-testid={testId}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={onClick ? 0 : -1}
      aria-label={`${label} section`}
      aria-current={isActive ? "true" : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1.5,
        py: 0.75,
        borderRadius: `${tokens.radii.control}px`,
        cursor: onClick ? "pointer" : "default",
        transition: navItemTransition,
        bgcolor: isActive ? alpha(color, isDark ? 0.16 : 0.1) : "transparent",
        border: `1px solid ${isActive ? alpha(color, 0.28) : "transparent"}`,
        "&:hover": onClick
          ? {
              bgcolor: alpha(color, isDark ? 0.12 : 0.07),
            }
          : {},
        "&:focus-visible": {
          outline: `2px solid ${alpha(tokens.colors.sidebar.focusRing, 0.5)}`,
          outlineOffset: 1,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", color }}>{icon}</Box>
        <Typography
          sx={{
            fontSize: "0.6875rem",
            fontWeight: 500,
            textTransform: "none",
            letterSpacing: 0,
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
        {count > 0 && (
          <Chip
            label={count}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.625rem",
              bgcolor: alpha(color, isDark ? 0.18 : 0.12),
              color: color,
              fontWeight: 500,
              minWidth: 18,
            }}
          />
        )}
      </Box>
      {onQuickCreate && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onQuickCreate();
          }}
          aria-label={getQuickCreateLabel(label)}
          data-testid={quickCreateTestId}
          sx={{
            color,
            p: 0.5,
            transition: navItemTransition,
            "&:hover": {
              bgcolor: alpha(color, 0.12),
            },
          }}
        >
          <PlusCircle style={{ width: 15, height: 15 }} />
        </IconButton>
      )}
    </Box>
  );

  const NavButton = ({
    id,
    activeId,
    label,
    subtext,
    sectionColor,
    onClick,
    testId,
  }: {
    id: string;
    activeId: string | null;
    label: string;
    subtext?: string;
    sectionColor: string;
    onClick: () => void;
    testId?: string;
  }) => {
    const isActive = id === activeId;
    return (
      <Button
        data-testid={testId}
        size="small"
        fullWidth
        onClick={onClick}
        aria-label={subtext ? `${label} (${subtext})` : label}
        aria-current={isActive ? "true" : undefined}
        sx={{
          justifyContent: "flex-start",
          px: 1.5,
          py: "2px",
          fontSize: "0.8125rem",
          lineHeight: 1.15,
          minHeight: 26,
          textTransform: "none",
          color: isActive ? sectionColor : "text.primary",
          bgcolor: isActive ? alpha(sectionColor, isDark ? 0.15 : 0.09) : "transparent",
          borderRadius: `${tokens.radii.control}px`,
          transition: navItemTransition,
          position: "relative",
          border: `1px solid ${isActive ? alpha(sectionColor, 0.28) : "transparent"}`,
          "&:hover": {
            bgcolor: alpha(sectionColor, isDark ? 0.12 : 0.07),
            color: sectionColor,
          },
          "&:focus-visible": {
            outline: `2px solid ${alpha(tokens.colors.sidebar.focusRing, 0.5)}`,
            outlineOffset: 1,
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", overflow: "hidden", minWidth: 0, gap: 0.75 }}>
          <Typography
            component="span"
            sx={{
              fontWeight: isActive ? 500 : 400,
              fontSize: "0.8125rem",
              lineHeight: 1.15,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {label}
          </Typography>
          {subtext && (
            <Typography
              component="span"
              sx={{
                fontSize: "0.6875rem",
                lineHeight: 1.15,
                color: "text.secondary",
                opacity: 0.7,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: 0,
                fontFamily: MONO_FONT,
                flexShrink: 1,
                minWidth: 0,
              }}
            >
              {subtext}
            </Typography>
          )}
        </Box>
      </Button>
    );
  };

  const SectionTray = ({ children }: { children: ReactNode }) => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.25,
        p: 0.75,
        borderRadius: `${tokens.radii.card}px`,
        bgcolor: tokens.colors.sidebar.trayTint,
        border: `1px solid ${tokens.colors.neutral.divider}`,
      }}
    >
      {children}
    </Box>
  );

  const EmptyTrayMessage = ({ text }: { text: string }) => (
    <Typography
      variant="caption"
      sx={{
        px: 1.5,
        py: 0.75,
        color: "text.disabled",
        fontStyle: "italic",
        fontSize: "0.75rem",
      }}
    >
      {text}
    </Typography>
  );

  const navContent = (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: tokens.colors.sidebar.railSurface,
        borderRight: variant === "desktop" ? 1 : 0,
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.5,
          py: 1.5,
          pb: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          ...scrollbarStyles,
        }}
      >
        <SectionTray>
          <SectionHeader
            icon={<Bot style={{ width: 15, height: 15 }} />}
            label="Agents"
            count={agentIds.length}
            color={sectionColors.agent}
            onQuickCreate={onOpenAgentDialog}
            onClick={() => handleSectionClick("agents")}
            isActive={activeId === "section-agents"}
            testId={variant === "desktop" ? "nav-link-agents" : undefined}
          />
          {agentIds.map((id) => (
            <NavButton
              key={id}
              id={`agent-${id}`}
              activeId={activeId}
              label={id}
              subtext={agentModelMap[id]}
              sectionColor={sectionColors.agent}
              onClick={() =>
                handleNavClick(`agent-${id}`, () => {
                  onNavToAgent(id);
                })
              }
              testId={variant === "desktop" ? `nav-link-agent-${id}` : undefined}
            />
          ))}
          {agentIds.length === 0 && (
            <EmptyTrayMessage text="No agents available" />
          )}
        </SectionTray>

        <SectionTray>
          <SectionHeader
            icon={<FolderTree style={{ width: 15, height: 15 }} />}
            label="Categories"
            count={categoryIds.length}
            color={sectionColors.category}
            onQuickCreate={onOpenCategoryDialog}
            onClick={() => handleSectionClick("categories")}
            isActive={activeId === "section-categories"}
            testId={variant === "desktop" ? "nav-link-categories" : undefined}
          />
          {categoryIds.map((id) => (
            <NavButton
              key={id}
              id={`category-${id}`}
              activeId={activeId}
              label={id}
              subtext={categoryModelMap[id]}
              sectionColor={sectionColors.category}
              onClick={() =>
                handleNavClick(`category-${id}`, () => {
                  onNavToCategory(id);
                })
              }
              testId={variant === "desktop" ? `nav-link-category-${id}` : undefined}
            />
          ))}
          {categoryIds.length === 0 && (
            <EmptyTrayMessage text="No categories available" />
          )}
        </SectionTray>

        <SectionTray>
          <SectionHeader
            icon={<Sliders style={{ width: 15, height: 15 }} />}
            label="Misc"
            count={miscSectionNames.length}
            color={sectionColors.misc}
            onQuickCreate={onOpenMiscDialog}
            quickCreateTestId={variant === "desktop" ? "misc-add-open" : undefined}
            onClick={() => handleSectionClick("misc")}
            isActive={activeId === "section-misc"}
            testId={variant === "desktop" ? "nav-link-misc" : undefined}
          />
          {miscSectionNames.map((name) => (
            <NavButton
              key={name}
              id={`misc-${name}`}
              activeId={activeId}
              label={name}
              sectionColor={sectionColors.misc}
              onClick={() =>
                handleNavClick(`misc-${name}`, () => {
                  onNavToMisc(name);
                })
              }
              testId={variant === "desktop" ? `nav-link-misc-${name}` : undefined}
            />
          ))}
          {miscSectionNames.length === 0 && (
            <EmptyTrayMessage text="No sections available" />
          )}
        </SectionTray>
      </Box>
    </Box>
  );

  return navContent;
}
