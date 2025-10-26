import { Box, Card, CardBody, CardHeader, Heading, SimpleGrid, Stack, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

import { requireRole } from '@/lib/authz';
import { listBranding } from '@/lib/admin/server-actions';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function getReadableTextColor(hex: string) {
  const value = hex.replace('#', '');
  if (value.length !== 6) {
    return 'white';
  }

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 128 ? 'gray.900' : 'white';
}

export default async function BrandingAdminPage() {
  const session = await requireRole('ADMIN');
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const { props } = await listBranding({ orgId });
  const { branding, assets, lastPublishedAt } = props;

  const colorPreviews = [
    { label: 'Primary color', value: branding.primaryColor },
    { label: 'Secondary color', value: branding.secondaryColor },
    branding.accentColor ? { label: 'Accent color', value: branding.accentColor } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const tokenRows = [
    { label: 'Organization', value: branding.organizationName },
    { label: 'Primary color', value: branding.primaryColor },
    { label: 'Secondary color', value: branding.secondaryColor },
    { label: 'Accent color', value: branding.accentColor ?? '—' },
    { label: 'Support email', value: branding.supportEmail ?? '—' },
    { label: 'Login message', value: branding.loginMessage ?? '—' },
    { label: 'Hero image URL', value: branding.heroImageUrl ?? '—' }
  ];

  return (
    <Stack spacing={8} px={{ base: 4, md: 8 }} py={{ base: 6, md: 8 }}>
      <Stack spacing={2}>
        <Heading size="lg">Branding & theme</Heading>
        <Text fontSize="sm" color="fg.muted">
          Review the current appearance settings for your LMS experience. Update colors and assets to keep the experience on brand.
        </Text>
        {lastPublishedAt ? (
          <Text fontSize="xs" color="fg.muted">
            Last published {dateFormatter.format(new Date(lastPublishedAt))}
          </Text>
        ) : null}
      </Stack>

      <SimpleGrid columns={{ base: 1, md: colorPreviews.length > 1 ? 3 : 1 }} spacing={4}>
        {colorPreviews.map((token) => (
          <Card key={token.label} borderRadius="xl" overflow="hidden">
            <Box bg={token.value} height={28} borderTopRadius="xl" display="flex" alignItems="center" justifyContent="center">
              <Text fontWeight="semibold" color={getReadableTextColor(token.value)}>
                {token.value}
              </Text>
            </Box>
            <CardBody>
              <Stack spacing={1}>
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.2em" color="fg.muted">
                  {token.label}
                </Text>
                <Text fontSize="sm" color="fg.default">
                  Preview
                </Text>
              </Stack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <Card borderRadius="xl">
        <CardHeader>
          <Heading size="md">Theme tokens</Heading>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th width="30%">Token</Th>
                  <Th>Value</Th>
                </Tr>
              </Thead>
              <Tbody>
                {tokenRows.map((token) => (
                  <Tr key={token.label}>
                    <Td fontWeight="medium">{token.label}</Td>
                    <Td>
                      <Text fontFamily={token.label.includes('color') ? 'mono' : undefined}>{token.value}</Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      <Card borderRadius="xl">
        <CardHeader>
          <Heading size="md">Brand assets</Heading>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>File</Th>
                  <Th>Uploaded by</Th>
                  <Th>Updated</Th>
                </Tr>
              </Thead>
              <Tbody>
                {assets.map((asset) => (
                  <Tr key={`${asset.type}-${asset.fileName}`}>
                    <Td textTransform="capitalize">{asset.type}</Td>
                    <Td>{asset.fileName}</Td>
                    <Td>
                      <Stack spacing={0}>
                        <Text fontWeight="medium">{asset.uploadedBy.name ?? 'Unknown user'}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {asset.uploadedBy.email ?? '—'}
                        </Text>
                      </Stack>
                    </Td>
                    <Td>{dateFormatter.format(new Date(asset.updatedAt))}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>
    </Stack>
  );
}
