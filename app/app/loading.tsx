import { Card, CardBody, SimpleGrid, Skeleton, SkeletonText, Stack } from "@chakra-ui/react";

export default function LearnerDashboardLoading() {
  return (
    <Stack spacing={10} align="flex-start" w="full">
      <Stack spacing={2} align="flex-start">
        <Skeleton height="32px" width="200px" />
        <Skeleton height="16px" width="280px" />
      </Stack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} w="full">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <CardBody>
              <Stack spacing={4}>
                <Skeleton height="20px" width="60%" />
                <SkeletonText noOfLines={3} spacing={3} />
                <Skeleton height="8px" borderRadius="full" />
              </Stack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
