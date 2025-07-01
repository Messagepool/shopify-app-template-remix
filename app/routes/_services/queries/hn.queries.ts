import { gql } from "graphql-request";

export const GET_PRIVILEGES = gql`
  query UserGroupPrivileges(
    $userGroupPrivilegesFilterInput: UserGroupPrivilegesFilterInput!
  ) {
    UserGroupPrivileges(
      userGroupPrivilegesFilterInput: $userGroupPrivilegesFilterInput
    ) {
      total
      current
      pages
      data {
        id
        username
        applications {
          id
          name
          privileges {
            id
            privilege
            read
            write
          }
        }
      }
    }
  }
`;

export const GET_PRIVILEGES_HASH = gql`
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
