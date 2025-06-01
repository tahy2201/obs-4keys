export function generateRepositoryUpsertParams(repo: { githubId: number, name: string, owner: string, htmlUrl: string }) {
  const repoCommonCulumns = {
    githubId: repo.githubId,
    name: repo.name,
    owner: repo.owner,
    htmlUrl: repo.htmlUrl,
    lastSync: new Date(),
  }
  return {
    where: {
      githubId: repo.githubId,
    },
    update: {
      ...repoCommonCulumns,
    },
    create: {
      ...repoCommonCulumns,
    }
  };
}

export function generateUserUpsertParams(user: { githubId: number, login: string, avatarUrl: string, htmlUrl: string }) {
  const userCommonCulumns = {
    githubId: user.githubId,
    login: user.login,
    avatarUrl: user.avatarUrl,
    htmlUrl: user.htmlUrl
  }

  return {
    where: {
      githubId: user.githubId,
    },
    update: {
      avatarUrl: user.avatarUrl,
      htmlUrl: user.htmlUrl,
      // login は更新しない - 既に別のユーザーが同じloginを持っている場合がある
    },
    create: {
      ...userCommonCulumns,
    }
  };
}

export function generatePRAssigneeUpsertParams(pullRequestId: number, assignee: { assigneeId: number, assigned_at: string }) {
  return {
    where: {
      id: pullRequestId,
    },
    data: {
      assignees: {
        connectOrCreate: {
          where: {
            pullRequestId_userId: {
              pullRequestId: pullRequestId,
              userId: assignee.assigneeId,
            }
          },
          create: {
            // pullRequestIdはwhereで設定されているので不要
            userId: assignee.assigneeId,
            assignedAt: new Date(assignee.assigned_at),
          }
        }
      }
    }
  }
}

export function generatePRReviewersUpsertParams(pullRequestId: number, reviewer: { userId: number, requested_at: string }) {
  return {
    where: {
      id: pullRequestId,
    },
    data: {
      requestedReviewers: {
        connectOrCreate: {
          where: {
            pullRequestId_userId: {
              pullRequestId: pullRequestId,
              userId: reviewer.userId,
            }
          },
          create: {
            // pullRequestIdはwhereで設定されているので不要
            userId: reviewer.userId,
            requestedAt: new Date(reviewer.requested_at),
          }
        }
      }
    }
  }
};

export function generateLabelUpsertParams(label: { githubId: number, name: string, color: string, description: string }) {
  const labelCommonCulumns = {
    githubId: label.githubId,
    name: label.name,
    color: label.color,
    description: label.description
  }

  return {
    where: {
      githubId: label.githubId,
    },
    update: {
      ...labelCommonCulumns,
    },
    create: {
      ...labelCommonCulumns,
    }
  };
}

export function generatePRLabelUpsertParams(pullRequestId: number, labelId: number) {
  return {
    where: {
      id: pullRequestId,
    },
    data: {
      labels: {
        connectOrCreate: {
          where: {
            pullRequestId_labelId: {
              pullRequestId: pullRequestId,
              labelId: labelId,
            }
          },
          create: {
            // pullRequestIdはwhereで設定されているので不要
            labelId: labelId
          }
        }
      }
    }
  }
}