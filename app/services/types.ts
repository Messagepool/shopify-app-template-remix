export type UserPrivilegeRequest = {
  userGroupPrivilegesFilterInput: {
    perPage: number;
    page: number;
    username: string;
    applicationId: string;
  };
};

export type UserPrivilegeHashRequest = {
  userId: string;
  getUserPrivilegesHashInput: {
    applicationId: string;
  };
};
