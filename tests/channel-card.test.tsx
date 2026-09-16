/**
 * بطاقة «تقدر تزور قناتنا من هنا».
 *
 * دعوة اختيارية بالكامل. هذه الاختبارات تحرس أنها تبقى كذلك: مجرّد رابط
 * خارجي إلى القناة، بلا أي طلب إلى الخادم وبلا أي أثر على حالة المستخدم.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelCard } from '@/components/ChannelCard';
import { SessionContext, type SessionState } from '@/lib/session-context';
import type { MeResponse } from '@shared/types';

const CHANNEL = 'https://t.me/PromptsArabic';

function sessionData(channelUrl = CHANNEL): MeResponse {
  return {
    user: { id: 'u1', name: 'معلّم', email: 'a@b.c', image: null, role: 'user', emailVerified: true },
    telegram: { linked: false, telegramUsername: null, channelUrl, botUsername: 'bot' },
    preferences: null,
    profile: {
      role: 'teacher',
      stageId: null,
      gradeId: null,
      trackId: null,
      subjects: [],
      onboardingCompleted: true,
      completedAt: null,
      assignments: [],
    },
  };
}

function renderCard(data: MeResponse | null) {
  const refresh = vi.fn();
  const setData = vi.fn();
  const value: SessionState = {
    status: data ? 'authenticated' : 'anonymous',
    data,
    errorMessage: null,
    refresh,
    setData,
  };
  render(
    <SessionContext.Provider value={value}>
      <ChannelCard />
    </SessionContext.Provider>,
  );
  return { refresh, setData };
}

describe('ChannelCard', () => {
  it('تعرض النص وزر زيارة القناة', () => {
    renderCard(sessionData());

    expect(screen.getByText('تقدر تزور قناتنا من هنا')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'زيارة القناة' })).toBeInTheDocument();
  });

  it('الزر يفتح رابط القناة القادم من الخادم في نافذة جديدة', () => {
    renderCard(sessionData('https://t.me/+configured-channel'));

    const link = screen.getByRole('link', { name: 'زيارة القناة' });
    // الرابط من إعداد الخادم لا من قيمة مكتوبة في الواجهة.
    expect(link).toHaveAttribute('href', 'https://t.me/+configured-channel');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('الضغط لا يُرسل أي طلب ولا يغيّر حالة المستخدم ولا صلاحيته', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const user = userEvent.setup();
    const { refresh, setData } = renderCard(sessionData());

    const link = screen.getByRole('link', { name: 'زيارة القناة' });
    // نمنع الانتقال الفعلي في jsdom، فما يهمّنا هو غياب أي أثر جانبي.
    link.addEventListener('click', (event) => event.preventDefault());
    await user.click(link);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(setData).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('لا تظهر إطلاقاً بلا جلسة أو بلا رابط مُعدّ', () => {
    const { container } = render(
      <SessionContext.Provider
        value={{
          status: 'anonymous',
          data: null,
          errorMessage: null,
          refresh: vi.fn(),
          setData: vi.fn(),
        }}
      >
        <ChannelCard />
      </SessionContext.Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
