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
    home: "HOME_PAGE",
  },
};

export const privilegeConfig: PrivilegeConfig = {
  restrictions: [
    {
      name: restrictedItem.page.home,
      type: "page",
      required: [
        {
          privilege: "template-app.home",
          access: ["read"],
        },
      ],
    },
  ],
};
