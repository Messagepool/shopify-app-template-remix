import { useState, useEffect } from "react";

import { TitleBar } from "@shopify/app-bridge-react";
import { LegacyCard, LegacyStack, Page, Spinner, Text } from "@shopify/polaris";

import PrivilegeIllustration from "../assets/images/privilege.svg";
import { PRIVILEGE_USER_DATA_KEY } from "../constants/privileges";

const PrivilegeScreen = ({ setPrivilegeSession, callback, noPrivileges }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isNoPrivilege, setIsNoPrivilege] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [userPrivilege, setUserPrivilege] = useState(null);

  useEffect(() => {
    const getUserPrivilege = sessionStorage.getItem(PRIVILEGE_USER_DATA_KEY);
    setUserPrivilege(getUserPrivilege);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!userPrivilege) {
      const getCurrentUser = () => {
        setIsLoading(true);
        fetch("/api/privileges")
          .then((response) => response.json())
          .then((data) => {
            if (!mounted) {
              return;
            }
            const { user, userData, application } = data;
            setDisplayName(userData?.name ?? "");
            setPrivilegeSession({
              privileges: application?.privileges,
              applicationName: application?.name,
              appId: application?.id,
              userId: user?.id,
              username: user?.username,
            });
          })
          .catch((error) => {
            console.error("Error:", error);
            setIsNoPrivilege(true);
          })
          .finally(() => {
            setTimeout(() => setIsLoading(false), 2000);
          });
      };
      getCurrentUser();
    } else {
      callback();
    }
    return () => {
      mounted = false;
    };
  }, [userPrivilege]);

  useEffect(() => {
    setIsNoPrivilege(noPrivileges);
  }, [noPrivileges]);

  return (
    <Page>
      <TitleBar />
      <LegacyCard sectioned>
        <div className="privilege-screen">
          <LegacyStack vertical alignment="center" spacing="baseTight">
            <img
              src={PrivilegeIllustration}
              width={300}
              alt="Application Privilege"
            />
            <Text variant="heading2xl" as="p">
              Welcome Back
            </Text>

            <Text variant="heading2xl" as="h1">
              {displayName}
            </Text>

            {isLoading ? (
              <LegacyStack vertical alignment="center" spacing="baseTight">
                <Text as="span" color="subdued" variant="bodyLg">
                  Please wait while we are fetching your updated application
                  privileges.
                </Text>
                <LegacyStack alignment="center">
                  <Spinner
                    accessibilityLabel="Loading privileges...."
                    size="small"
                  />
                  <Text variant="headingMd" as="p">
                    Loading privileges....
                  </Text>
                </LegacyStack>
              </LegacyStack>
            ) : isNoPrivilege && !isLoading ? (
              <Text variant="headingMd" as="p">
                It appears that you do not have sufficient privileges to access
                this application. Please contact the administrator.
              </Text>
            ) : null}
          </LegacyStack>
        </div>
      </LegacyCard>
    </Page>
  );
};

export default PrivilegeScreen;
