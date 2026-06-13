import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Consistent page heading: title on the left, action buttons on the right,
// optional subtitle/meta content below.
export default function PageHeader({ title, subtitle, actions, children, sx }) {
  return (
    <Box sx={{ mb: 2.5, ...sx }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" variant="h5" noWrap>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {actions ? (
          <Box
            sx={{
              ml: "auto",
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            {actions}
          </Box>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}
