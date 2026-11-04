/**
 * One page of an owner's public repositories, most recently pushed first.
 * `repositoryOwner` resolves both users and organizations. Commit counts
 * come from the default branch's history, in the same request.
 */
export const CITY_QUERY = /* GraphQL */ `
  query City($login: String!, $first: Int!, $after: String) {
    repositoryOwner(login: $login) {
      __typename
      login
      url
      avatarUrl(size: 160)
      ... on User {
        name
      }
      ... on Organization {
        name
      }
      repositories(
        first: $first
        after: $after
        privacy: PUBLIC
        ownerAffiliations: [OWNER]
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          description
          url
          isFork
          isArchived
          stargazerCount
          forkCount
          diskUsage
          createdAt
          pushedAt
          primaryLanguage {
            name
          }
          parent {
            nameWithOwner
          }
          defaultBranchRef {
            target {
              ... on Commit {
                committedDate
                history {
                  totalCount
                }
              }
            }
          }
        }
      }
    }
  }
`;
