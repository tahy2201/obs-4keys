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
      ...userCommonCulumns,
    },
    create: {
      ...userCommonCulumns,
    }
  };
}

export function generateRepositoryUpsertParams(repo: {githubId: number, name: string, owner: string, htmlUrl: string}) {
  const repoCommonCulumns = {
    githubId: repo.githubId,
    name: repo.name,
    owner: repo.owner,
    htmlUrl: repo.htmlUrl
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