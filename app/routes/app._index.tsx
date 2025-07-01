import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Page, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {};

export default function Index() {
  return (
    <Page>
      <TitleBar title="Remix App Template" />
      <Text variant="bodyLg" as="p">
        This is an empty app template.
      </Text>
    </Page>
  );
}
