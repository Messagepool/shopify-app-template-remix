import { useEffect, useState } from "react";
import { BlockStack, Card, Page, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import PrivilegeIllustration from "../assets/images/privilege.svg";
import { useAppPrivilege } from "app/hooks/useAppPrivilege";

const PageUnavailable = () => {
  return (
    <Page>
      <TitleBar />
      <Card>
        <div style={{ padding: 30 }}>
          <BlockStack inlineAlign="center">
            <img
              src={PrivilegeIllustration}
              width={300}
              alt="Application Privilege"
            />
            <Text variant="heading3xl" as="p">
              This page is not available.
            </Text>
            <Text as="span" tone="subdued">
              It appears that you may have insufficient privilege to access this
              page. Please contact administrator.
            </Text>
          </BlockStack>
        </div>
      </Card>
    </Page>
  );
};

interface WithPrivilegeProps {
  [key: string]: any;
}

interface UseAppPrivilegeResult {
  hasAccessTo: (restrictionName: string) => boolean;
  initialized: boolean;
}

const withPrivilege = (
  restrictionName: string,
  WrappedComponent: React.ComponentType<any>,
) => {
  return (props: WithPrivilegeProps) => {
    const { hasAccessTo, initialized }: UseAppPrivilegeResult =
      useAppPrivilege();
    const [hasAccess, setHasAccess] = useState<boolean>(false);

    useEffect(() => {
      if (!initialized) return;

      const withAccess = hasAccessTo(restrictionName);

      setHasAccess(withAccess);
    }, [initialized, hasAccessTo, restrictionName]);

    if (!initialized) {
      return null;
    }

    return hasAccess ? <WrappedComponent {...props} /> : <PageUnavailable />;
  };
};

export default withPrivilege;
