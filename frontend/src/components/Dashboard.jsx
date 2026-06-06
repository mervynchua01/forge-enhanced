import { Box, Stack, Typography } from "@mui/material";
import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout, ThemeSwitcher } from "@toolpad/core/DashboardLayout";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import {
  Account,
  AccountPreview,
  AccountPopoverFooter,
  SignOutButton,
} from "@toolpad/core/Account";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import { useSession } from "@toolpad/core/useSession";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "./UserAvatar";
import forgeLogo from "../assets/FORGE.png";
import { theme } from "../styles/theme";
import { useEffect, useMemo, useState } from "react";

const NAVIGATION = [
  {
    kind: "header",
    title: "Workspace",
  },
  {
    segment: "projects",
    title: "Projects",
    icon: <DashboardIcon />,
  },
];

function CustomToolbarActions() {
  return (
    <Stack direction="row">
      <ThemeSwitcher />
    </Stack>
  );
}

function AccountSidebarPreview(props) {
  const { handleClick, open, mini } = props;
  const session = useSession();
  if (!session?.user) return null;
  return (
    <Stack direction="column" p={0}>
      <Divider />
      <AccountPreview
        variant={mini ? "condensed" : "expanded"}
        handleClick={handleClick}
        open={open}
        slotProps={{
          avatar: {
            children: <UserAvatar name={session.user.name} />,
          },
        }}
      />
    </Stack>
  );
}

function SidebarFooterAccountPopover() {
  const session = useSession();
  if (!session?.user) return null;
  return (
    <Stack direction="column">
      <Box sx={{ p: 2, display: "flex", gap: 2 }}>
        <UserAvatar name={session.user.name} />
        <ListItemText
          primary={session.user.name}
          secondary={session.user.email}
          primaryTypographyProps={{ variant: "body2" }}
          secondaryTypographyProps={{ variant: "caption" }}
        />
      </Box>
      <Divider />
      <AccountPopoverFooter>
        <SignOutButton />
      </AccountPopoverFooter>
    </Stack>
  );
}

const createPreviewComponent = (mini) => {
  function PreviewComponent(props) {
    return <AccountSidebarPreview {...props} mini={mini} />;
  }
  return PreviewComponent;
};

function SidebarFooterAccount({ mini }) {
  const session = useSession();

  if (!session?.user) return null;

  const PreviewComponent = useMemo(() => createPreviewComponent(mini), [mini]);
  return (
    <Box sx={{ p: 2 }}>
      <Account
        slots={{
          preview: PreviewComponent,
          popoverContent: SidebarFooterAccountPopover,
        }}
        slotProps={{
          popover: {
            transformOrigin: { horizontal: "left", vertical: "bottom" },
            anchorOrigin: { horizontal: "right", vertical: "bottom" },
            disableAutoFocus: true,
            slotProps: {
              paper: {
                elevation: 0,
                sx: {
                  overflow: "visible",
                  filter: (theme) =>
                    `drop-shadow(0px 2px 8px ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.32)"})`,
                  mt: 1,
                  "&::before": {
                    content: '""',
                    display: "block",
                    position: "absolute",
                    bottom: 10,
                    left: 0,
                    width: 10,
                    height: 10,
                    bgcolor: "background.paper",
                    transform: "translate(-50%, -50%) rotate(45deg)",
                    zIndex: 0,
                  },
                },
              },
            },
          },
        }}
      />
    </Box>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signOut } = useAuth();

  const router = useMemo(() => {
    return {
      pathname: location.pathname,
      searchParams: new URLSearchParams(location.search),
      navigate: (path) => navigate(path),
    };
  }, [location, navigate]);

  const userSession = user
    ? {
        user: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        },
      }
    : null;

  const [session, setSession] = useState(userSession);

  useEffect(() => {
    setSession(userSession);
  }, [userSession]);

  if (loading) {
    return null;
  }

  return (
    <AppProvider
      navigation={NAVIGATION}
      branding={{
        logo: <img src={forgeLogo} alt="FORGE logo" style={{ height: 50 }} />,
        title: "",
        homeUrl: "/projects",
      }}
      router={router}
      theme={theme}
      session={session}
      authentication={{
        signOut: async () => {
          setSession(null);
          await signOut();
          navigate("/signout");
        },
      }}
    >
      <DashboardLayout
        slots={{
          toolbarActions: CustomToolbarActions,
          sidebarFooter: SidebarFooterAccount,
        }}
      >
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </DashboardLayout>
    </AppProvider>
  );
}

export default Dashboard;
