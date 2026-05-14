import type { ReactNode } from "react";
import { useState, useCallback, useMemo } from "react";
import { Box, Drawer, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, IconButton, useMediaQuery, useTheme } from "@mui/material";
import { X, RotateCcw, Save, Bot, Tag, Settings2 } from "lucide-react";
import { alpha } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { AppHeader } from "./shell/AppHeader";
import { SidebarNav } from "./shell/SidebarNav";
import { SectionShell } from "./shell/SectionShell";
import { lightTokens, darkTokens } from "../theme/designTokens";
import { DURATIONS, EASING } from "../theme/motionTokens";
import type { ProviderActivationMenuProps } from "./providers/ProviderActivationMenu";

interface AppShellProps {
  title?: string;
  themeToggle?: ReactNode;
  syncReplaceToggle?: ReactNode;
  zoomControls?: ReactNode;
  profileSelector: ReactNode;
  copyProfileButton?: ReactNode;
  totalReloadButton?: ReactNode;
  setDefaultProfileButton?: ReactNode;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
  onSave: () => void;
  onReset: () => void;
  agentsSection?: ReactNode;
  categoriesSection?: ReactNode;
  miscSection?: ReactNode;
  readonlyTail?: ReactNode;
  conflictBanner?: ReactNode;
  successMessage?: string | null;
  agentIds?: string[];
  categoryIds?: string[];
  miscSectionNames?: string[];
  agentModelMap?: Record<string, string | undefined>;
  categoryModelMap?: Record<string, string | undefined>;
  agentsEmpty?: boolean;
  categoriesEmpty?: boolean;
  onRawConfigOpen?: () => void;
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  onNavToAgent?: (id: string) => void;
  onNavToCategory?: (id: string) => void;
  onNavToMisc?: (name: string) => void;
  agentsCollapsed?: boolean;
  categoriesCollapsed?: boolean;
  miscCollapsed?: boolean;
  onToggleAgents?: () => void;
  onToggleCategories?: () => void;
  onToggleMisc?: () => void;
  onCreateAgent?: (id: string) => void;
  onCreateCategory?: (id: string) => void;
  onOpenMiscDialog?: () => void;
  respectsMotion?: boolean;
  isSaving?: boolean;
  saveSuccess?: boolean;
  providerPanelProps?: ProviderActivationMenuProps;
}

const sectionEntrance = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export function AppShell({
  title = "omo-switch",
  themeToggle,
  syncReplaceToggle,
  zoomControls,
  profileSelector,
  copyProfileButton,
  totalReloadButton,
  setDefaultProfileButton,
  loading,
  error,
  isDirty,
  onSave,
  onReset,
  agentsSection,
  categoriesSection,
  miscSection,
  conflictBanner,
  successMessage,
  agentIds = [],
  categoryIds = [],
  miscSectionNames = [],
  agentModelMap = {},
  categoryModelMap = {},
  agentsEmpty = false,
  categoriesEmpty = false,
  onRawConfigOpen,
  onCollapseAll,
  onExpandAll,
  onNavToAgent,
  onNavToCategory,
  onNavToMisc,
  agentsCollapsed,
  categoriesCollapsed,
  miscCollapsed,
  onToggleAgents,
  onToggleCategories,
  onToggleMisc,
  onCreateAgent,
  onCreateCategory,
  onOpenMiscDialog,
  respectsMotion = true,
  isSaving = false,
  saveSuccess = false,
  providerPanelProps,
}: AppShellProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;

  const sectionColors = {
    agentPrimary: tokens.colors.section.agentPrimary,
    categoryPrimary: tokens.colors.section.categoryPrimary,
    miscPrimary: tokens.colors.section.miscPrimary,
  };

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newAgentId, setNewAgentId] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [agentError, setAgentError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const toggleNav = useCallback(() => setIsNavOpen((prev) => !prev), []);
  const closeNav = useCallback(() => setIsNavOpen(false), []);

  const isAllCollapsed = !!agentsCollapsed && !!categoriesCollapsed && !!miscCollapsed;
  const mobileActionBarHeight = 88;

  const handleToggleAll = useCallback(() => {
    if (isAllCollapsed) {
      onExpandAll?.();
    } else {
      onCollapseAll?.();
    }
  }, [isAllCollapsed, onExpandAll, onCollapseAll]);

  const handleOpenAgentDialog = useCallback(() => {
    setNewAgentId("");
    setAgentError(null);
    setShowAgentDialog(true);
  }, []);

  const handleOpenCategoryDialog = useCallback(() => {
    setNewCategoryId("");
    setCategoryError(null);
    setShowCategoryDialog(true);
  }, []);

  const handleSubmitAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newAgentId.trim();
    if (!id) return;

    if (agentIds.includes(id)) {
      setAgentError(`Agent "${id}" already exists`);
      return;
    }

    onCreateAgent?.(id);
    setShowAgentDialog(false);
    setNewAgentId("");
    setAgentError(null);
  };

  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newCategoryId.trim();
    if (!id) return;

    if (categoryIds.includes(id)) {
      setCategoryError(`Category "${id}" already exists`);
      return;
    }

    onCreateCategory?.(id);
    setShowCategoryDialog(false);
    setNewCategoryId("");
    setCategoryError(null);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "text.primary",
      }}
    >
      <Box
        sx={{
          maxWidth: 1440,
          mx: "auto",
          width: "100%",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          px: { xs: 0, lg: 2, xl: 3 },
        }}
      >
        {conflictBanner}

        <AppHeader
          title={title}
          themeToggle={themeToggle}
          syncReplaceToggle={syncReplaceToggle}
          zoomControls={zoomControls}
          profileSelector={profileSelector}
          copyProfileButton={copyProfileButton}
          totalReloadButton={totalReloadButton}
          setDefaultProfileButton={setDefaultProfileButton}
          error={error}
          isDirty={isDirty}
          successMessage={successMessage}
          loading={loading}
          onSave={onSave}
          onReset={onReset}
          onRawConfigOpen={onRawConfigOpen}
          isAllCollapsed={isAllCollapsed}
          isMobile={isMobile}
          onToggleAll={handleToggleAll}
          onMobileNavToggle={toggleNav}
          isNavOpen={isNavOpen}
          agentIds={agentIds}
          categoryIds={categoryIds}
          miscSectionNames={miscSectionNames}
          agentModelMap={agentModelMap}
          categoryModelMap={categoryModelMap}
          isSaving={isSaving}
          saveSuccess={saveSuccess}
          providerPanelProps={providerPanelProps}
        />

          <Box sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
            <Drawer
              anchor="left"
              open={isNavOpen}
              onClose={closeNav}
              ModalProps={{ keepMounted: true }}
              PaperProps={{
                sx: {
                  width: 336,
                  maxWidth: "85vw",
                  display: "flex",
                  flexDirection: "column",
                  bgcolor: tokens.colors.sidebar.railSurface,
                  borderRight: `1px solid ${tokens.colors.neutral.divider}`,
                },
              }}
              sx={{
                display: { xs: "block", lg: "none" },
                "& .MuiDrawer-paper": {
                  border: "none",
                  boxShadow: `0 16px 40px ${alpha(tokens.colors.neutral.textPrimary, isDark ? 0.28 : 0.12)}`,
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: tokens.colors.sidebar.elevatedSurface,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    letterSpacing: 0,
                    color: tokens.colors.neutral.textPrimary,
                  }}
                >
                  Navigation
                </Typography>
                <IconButton
                  onClick={closeNav}
                  size="small"
                  aria-label="Close navigation"
                  sx={{
                    p: 0.5,
                    transition: `all ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`,
                    "&:hover": {
                      bgcolor: alpha(tokens.colors.neutral.textSecondary, 0.12),
                    },
                  }}
                >
                  <X style={{ width: 18, height: 18 }} />
                </IconButton>
              </Box>
              <Box sx={{ flex: 1, overflow: "hidden", px: 0, py: 0 }}>
                <SidebarNav
                  agentIds={agentIds}
                  categoryIds={categoryIds}
                  miscSectionNames={miscSectionNames}
                  agentModelMap={agentModelMap}
                  categoryModelMap={categoryModelMap}
                  onNavToAgent={onNavToAgent ?? (() => {})}
                  onNavToCategory={onNavToCategory ?? (() => {})}
                  onNavToMisc={onNavToMisc ?? (() => {})}
                  onNavToSection={(section) => {
                    scrollToId(`section-${section}`);
                    closeNav();
                  }}
                  onOpenAgentDialog={handleOpenAgentDialog}
                  onOpenCategoryDialog={handleOpenCategoryDialog}
                  onOpenMiscDialog={onOpenMiscDialog}
                  variant="mobile"
                  onCloseMobile={closeNav}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  px: 2,
                  py: 1,
                  borderTop: 1,
                  borderColor: "divider",
                  bgcolor: tokens.colors.sidebar.elevatedSurface,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  onClick={closeNav}
                  startIcon={<X style={{ width: 16, height: 16 }} />}
                  sx={{
                    textTransform: "none",
                    borderRadius: `${tokens.radii.control}px`,
                    fontSize: "0.75rem",
                  }}
                >
                  Close
                </Button>
              </Box>
            </Drawer>

          <Box
            component="nav"
            id="app-nav"
            aria-label="Section navigation"
            sx={{
              display: { xs: "none", lg: "block" },
              flexShrink: 0,
              width: 336,
              height: "100%",
              overflow: "hidden",
              borderRight: `1px solid ${tokens.colors.neutral.divider}`,
            }}
          >
            <SidebarNav
              agentIds={agentIds}
              categoryIds={categoryIds}
              miscSectionNames={miscSectionNames}
              agentModelMap={agentModelMap}
              categoryModelMap={categoryModelMap}
              onNavToAgent={(id) => {
                onNavToAgent?.(id);
                scrollToId(`agent-${id}`);
              }}
              onNavToCategory={(id) => {
                onNavToCategory?.(id);
                scrollToId(`category-${id}`);
              }}
              onNavToMisc={(name) => {
                onNavToMisc?.(name);
                scrollToId(`misc-${name}`);
              }}
              onNavToSection={(section) => {
                scrollToId(`section-${section}`);
              }}
              onOpenAgentDialog={handleOpenAgentDialog}
              onOpenCategoryDialog={handleOpenCategoryDialog}
              onOpenMiscDialog={onOpenMiscDialog}
              variant="desktop"
            />
          </Box>

          <Box
            component="main"
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              p: { xs: 1.5, lg: 3 },
              paddingBottom: isDirty
                ? { xs: `calc(${mobileActionBarHeight}px + env(safe-area-inset-bottom, 0px))`, sm: 1.5 }
                : 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              "& > *": { flexShrink: 0 },
            }}
          >
            <Box
              sx={{
                animation: respectsMotion
                  ? `${sectionEntrance} ${DURATIONS.SLOWER}ms ${EASING.EASE_OUT} both`
                  : "none",
                animationDelay: respectsMotion ? "0ms" : "0s",
              }}
            >
              <SectionShell
                id="section-agents"
                title="Agents Configuration"
                sectionColor={sectionColors.agentPrimary}
                count={agentIds.length}
                collapsed={agentsCollapsed ?? false}
                onToggle={onToggleAgents ?? (() => {})}
                testId="agents-section"
                emptyState={agentsEmpty ? {
                  icon: <Bot style={{ width: 24, height: 24 }} />,
                  title: "No agents configured",
                  description: "Add your first agent to start building your configuration.",
                } : undefined}
                onAddClick={agentsEmpty ? handleOpenAgentDialog : undefined}
              >
                {agentsSection ?? (
                  <Typography color="text.secondary">Agents content placeholder</Typography>
                )}
              </SectionShell>
            </Box>

            <Box
              sx={{
                animation: respectsMotion
                  ? `${sectionEntrance} ${DURATIONS.SLOWER}ms ${EASING.EASE_OUT} both`
                  : "none",
                animationDelay: respectsMotion ? "80ms" : "0s",
              }}
            >
              <SectionShell
                id="section-categories"
                title="Categories Configuration"
                sectionColor={sectionColors.categoryPrimary}
                count={categoryIds.length}
                collapsed={categoriesCollapsed ?? false}
                onToggle={onToggleCategories ?? (() => {})}
                testId="categories-section"
                emptyState={categoriesEmpty ? {
                  icon: <Tag style={{ width: 24, height: 24 }} />,
                  title: "No categories configured",
                  description: "Organize your agents by creating your first category.",
                } : undefined}
                onAddClick={categoriesEmpty ? handleOpenCategoryDialog : undefined}
              >
                {categoriesSection ?? (
                  <Typography color="text.secondary">Categories content placeholder</Typography>
                )}
              </SectionShell>
            </Box>

            <Box
              sx={{
                animation: respectsMotion
                  ? `${sectionEntrance} ${DURATIONS.SLOWER}ms ${EASING.EASE_OUT} both`
                  : "none",
                animationDelay: respectsMotion ? "160ms" : "0s",
              }}
            >
              <SectionShell
                id="section-misc"
                title="Misc Configuration"
                sectionColor={sectionColors.miscPrimary}
                count={miscSectionNames.length}
                collapsed={miscCollapsed ?? false}
                onToggle={onToggleMisc ?? (() => {})}
                testId="misc-section"
                emptyState={miscSectionNames.length === 0 ? {
                  icon: <Settings2 style={{ width: 24, height: 24 }} />,
                  title: "No misc settings",
                  description: "Additional profile settings will appear here when present.",
                } : undefined}
                onAddClick={miscSectionNames.length === 0 ? onOpenMiscDialog : undefined}
              >
                {miscSection ?? (
                  <Typography color="text.secondary">Misc content placeholder</Typography>
                )}
              </SectionShell>
            </Box>
          </Box>
        </Box>

        {isDirty && (
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              alignItems: "center",
              justifyContent: "space-between",
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              bgcolor: alpha(tokens.colors.neutral.surface, 0.92),
              backdropFilter: "blur(12px)",
              borderTop: `1px solid ${tokens.colors.neutral.divider}`,
              px: 2,
              pt: 1.25,
              pb: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
              gap: 1,
            }}
          >
            <Button
              variant="outlined"
              onClick={onReset}
              disabled={loading}
              startIcon={<RotateCcw size={16} />}
              fullWidth
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.8125rem",
                transition: `all ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`,
                "&:hover": {
                  bgcolor: alpha(tokens.colors.status.error, 0.08),
                  borderColor: alpha(tokens.colors.status.error, 0.3),
                },
              }}
            >
              Discard
            </Button>
            <Button
              variant="contained"
              onClick={onSave}
              disabled={loading}
              startIcon={<Save size={16} />}
              fullWidth
              color="primary"
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.8125rem",
                boxShadow: "none",
                transition: `all ${DURATIONS.FAST}ms ${EASING.EASE_OUT}`,
                "&:hover": {
                  boxShadow: "none",
                },
              }}
            >
              Save Changes
            </Button>
          </Box>
        )}

        <Dialog
          open={showAgentDialog}
          onClose={() => setShowAgentDialog(false)}
          data-testid="create-agent-dialog"
          aria-labelledby="create-agent-title"
          maxWidth="xs"
          fullWidth
        >
          <form onSubmit={handleSubmitAgent}>
            <DialogTitle id="create-agent-title">Create New Agent</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Agent ID"
                type="text"
                fullWidth
                variant="outlined"
                value={newAgentId}
                onChange={(e) => {
                  setNewAgentId(e.target.value);
                  setAgentError(null);
                }}
                inputProps={{ "data-testid": "new-agent-id-input" }}
                error={!!agentError}
                helperText={agentError}
              />
              {agentError && (
                <Typography
                  variant="caption"
                  color="error"
                  data-testid="agent-error"
                  sx={{ mt: 0.5, ml: 2 }}
                >
                  {agentError}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowAgentDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={!newAgentId.trim()} data-testid="create-agent-submit">
                Create
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        <Dialog
          open={showCategoryDialog}
          onClose={() => setShowCategoryDialog(false)}
          data-testid="create-category-dialog"
          aria-labelledby="create-category-title"
          maxWidth="xs"
          fullWidth
        >
          <form onSubmit={handleSubmitCategory}>
            <DialogTitle id="create-category-title">Create New Category</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Category ID"
                type="text"
                fullWidth
                variant="outlined"
                value={newCategoryId}
                onChange={(e) => {
                  setNewCategoryId(e.target.value);
                  setCategoryError(null);
                }}
                inputProps={{ "data-testid": "new-category-id-input" }}
                error={!!categoryError}
                helperText={categoryError}
              />
              {categoryError && (
                <Typography
                  variant="caption"
                  color="error"
                  data-testid="category-error"
                  sx={{ mt: 0.5, ml: 2 }}
                >
                  {categoryError}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={!newCategoryId.trim()}
                data-testid="create-category-submit"
              >
                Create
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Box>
  );
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  }
}
