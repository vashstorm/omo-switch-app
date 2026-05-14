import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
import { MONO_FONT } from '../theme/typography';
import { EASING, DURATIONS } from '../theme/motionTokens';
import { lightTokens, darkTokens } from '../theme/designTokens';

interface ProfileItem {
  id: string;
  label: string;
}

interface ProfileSelectorProps {
  profiles: ProfileItem[];
  selectedId: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ProfileSelector({ profiles, selectedId, onChange, disabled }: ProfileSelectorProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const tokens = isDark ? darkTokens : lightTokens;

  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-testid="profile-selector">
      <Typography
        variant="body2"
        sx={{
          display: { xs: 'none', sm: 'inline' },
          color: 'text.secondary',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}
      >
        Profile:
      </Typography>
      <FormControl
        size="small"
        sx={{ width: { xs: 132, sm: 180 } }}
        disabled={disabled || profiles.length === 0}
      >
        <Select
          value={selectedId || ""}
          onChange={handleChange}
          displayEmpty
          size="small"
          data-testid="profile-select-trigger"
          sx={{
            width: '100%',
            fontFamily: MONO_FONT,
            fontSize: '0.8125rem',
            '& .MuiSelect-select': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: MONO_FONT,
            },
            '& .MuiOutlinedInput-notchedOutline': {
              transition: `border-color ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
            },
            // No label -> no notch needed. Disable the legend max-width animation
            // that causes the border-gap flicker during re-renders.
            '& .MuiOutlinedInput-notchedOutline legend': {
              maxWidth: '0 !important',
              transition: 'none !important',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(tokens.colors.brand.main, 0.4),
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: tokens.colors.brand.main,
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                borderRadius: 2,
                border: `1px solid ${tokens.colors.neutral.divider}`,
                mt: 0.5,
                maxWidth: 420,
                '& .MuiMenuItem-root': {
                  fontFamily: MONO_FONT,
                  fontSize: '0.8125rem',
                  py: 0.75,
                  px: 1.5,
                  '&.Mui-selected': {
                    bgcolor: alpha(tokens.colors.brand.main, 0.08),
                    '&:hover': {
                      bgcolor: alpha(tokens.colors.brand.main, 0.14),
                    },
                  },
                },
              },
            },
          }}
          renderValue={(value) => {
            if (!value) {
              return <em style={{ opacity: 0.6 }}>Select a profile...</em>;
            }
            const profile = profiles.find((p) => p.id === value);
            return profile ? profile.label : value;
          }}
        >
          {profiles.map((p) => (
            <MenuItem key={p.id} value={p.id} data-testid={`profile-option-${p.id}`}>
              {p.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
