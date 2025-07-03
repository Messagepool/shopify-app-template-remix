import { useState, useEffect } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  LegacyCard,
  LegacyStack,
  Page,
  SkeletonDisplayText,
  Spinner,
  Text,
} from "@shopify/polaris";
import PrivilegeIllustration from "../assets/images/privilege.svg";

const getUser = async () => {
  return fetch(`/api/user`).then((res) => res.json());
};

interface PrivilegeScreenProps {
  onLogin: () => void;
  reloading: boolean;
}

const PrivilegeScreen = ({ onLogin, reloading }: PrivilegeScreenProps) => {
  const [fetchingUser, setFetchingUser] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let mounted = true;

    setFetchingUser(true);
    getUser()
      .then((user) => {
        if (!mounted) {
          return;
        }

        setDisplayName(user?.name ?? "");
        setFetchingUser(false);

        return onLogin();
      })
      .catch((error) => {
        console.error(error);
      });

    () => {
      mounted = false;
    };
  }, []);

  return (
    <Page>
      <TitleBar />
      <LegacyCard sectioned>
        <div style={{ padding: 30 }}>
          <LegacyStack vertical alignment="center" spacing="baseTight">
            <img
              src={PrivilegeIllustration}
              width={300}
              alt="Application Privilege"
            />
            {reloading ? (
              <Text variant="heading3xl" as="h1">
                Loading privileges ...
              </Text>
            ) : (
              <LegacyStack vertical alignment="center">
                <Text variant="heading2xl" as="p">
                  Welcome back
                </Text>
                {fetchingUser ? (
                  <SkeletonDisplayText size="large" />
                ) : (
                  <Text variant="heading3xl" as="h1">
                    {displayName}
                  </Text>
                )}
              </LegacyStack>
            )}
            <Text as="span" tone="subdued" variant="bodyLg">
              Please wait while we are fetching your updated application
              privileges.
            </Text>
            <Spinner accessibilityLabel="Loading privileges ..." size="large" />
          </LegacyStack>
        </div>
      </LegacyCard>
    </Page>
  );
};

export default PrivilegeScreen;
