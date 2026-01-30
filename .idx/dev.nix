{ pkgs, ... }: {
  # Nixpkgs channel to use.
  channel = "stable-25.05";

  # Packages needed for the project.
  # See https://search.nixos.org/packages for available packages.
  packages = [
    pkgs.nodejs_24
    pkgs.pnpm_9
    pkgs.turbo
    pkgs.google-cloud-sdk
    pkgs.docker
  ];

  # IDE configuration.
  idx = {
    # VS Code extensions.
    # Find more on https://open-vsx.org/.
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "ms-vscode.vscode-typescript-next"
      "vscodearr.find-in-files"
      "eamodio.gitlens"
      "ms-azuretools.vscode-docker"
      "cloudflare.vscode-cloudflare-wrangler"
    ];

    # Previews configuration.
    previews = {
      enable = true;
      previews = {};
    };

    # Workspace settings.
    workspace = {};
  };
}
