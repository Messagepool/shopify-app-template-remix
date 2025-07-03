type AccessString = "read" | "write";

type PrivilegeConfig = {
  restrictions: Array<{
    name: string;
    type: "action" | "page";
    required: Array<{
      privilege: string;
      access: AccessString[];
    }>;
  }>;
};

export const restrictedItem = {
  page: {
    restricted: "RESTRICTED_PAGE",
  },
};

export const privilegeConfig: PrivilegeConfig = {
  restrictions: [
    {
      name: restrictedItem.page.restricted,
      type: "page",
      required: [
        {
          privilege: "template-app.restricted",
          access: ["read"],
        },
      ],
    },
  ],
};
