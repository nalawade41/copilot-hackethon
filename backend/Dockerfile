# ---- build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files first for restore caching
COPY CopilotDicom.Api/CopilotDicom.Api.csproj CopilotDicom.Api/
RUN dotnet restore CopilotDicom.Api/CopilotDicom.Api.csproj

# Copy the rest and publish
COPY . .
RUN dotnet publish CopilotDicom.Api/CopilotDicom.Api.csproj \
    -c Release -o /app/publish --no-restore

# ---- runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

# Fly's proxy forwards to 8080 by default
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "CopilotDicom.Api.dll"]