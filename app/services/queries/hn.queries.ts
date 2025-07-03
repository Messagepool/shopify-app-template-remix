export type UserGroupPrivilegesResponse = {
  data: Array<{
    id: string;
    applications: Array<{
      privileges: Array<{
        privilege: string;
        read: string;
        write: string;
      }>;
    }>;
    userStoreDepartments: Array<{
      storeCode: string;
      departments: string[];
    }>;
  }>;
};

export const GET_PRIVILEGES = `
  query UserGroupPrivileges(
    $userGroupPrivilegesFilterInput: UserGroupPrivilegesFilterInput!
  ) {
    UserGroupPrivileges(
      userGroupPrivilegesFilterInput: $userGroupPrivilegesFilterInput
    ) {
      data {
        id
        applications {
          privileges {
            privilege
            read
            write
          }
        }
        userStoreDepartments {
          storeCode
          departments
        }
      }
    }
  }
`;

export const GET_PRIVILEGES_HASH = `
  query GetUserPrivilegesHash(
    $userId: ID!
    $getUserPrivilegesHashInput: GetUserPrivilegesHashInput!
  ) {
    GetUserPrivilegesHash(
      userId: $userId
      getUserPrivilegesHashInput: $getUserPrivilegesHashInput
    ) {
      hash
    }
  }
`;
